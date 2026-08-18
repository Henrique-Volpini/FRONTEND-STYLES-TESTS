import json
from decimal import Decimal, InvalidOperation

from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import IntegrityError, transaction
from django.db.models import Max
from django.http import JsonResponse
from django.shortcuts import redirect, render

from .models import Categoria, Comida


REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60


def _home_data():
    categorias = Categoria.objects.prefetch_related('comidas').all()
    cafes = []
    category_data = []

    for categoria in categorias:
        category_coffees = list(categoria.comidas.all())
        category_data.append(
            {
                'id': str(categoria.id),
                'name': categoria.titulo,
                'description': categoria.texto,
                'coffeeCount': len(category_coffees),
            }
        )
        cafes.extend(
            {
                'id': str(cafe.id),
                'categoryId': str(categoria.id),
                'name': cafe.nome,
                'price': format(cafe.preco, '.2f'),
                'description': cafe.descricao,
                'image': cafe.imagem,
            }
            for cafe in category_coffees
        )

    cafes.sort(key=lambda cafe: int(cafe['id']))
    return {'categories': category_data, 'coffees': cafes}


def _home_response(message, *, created_id=None):
    response = {'ok': True, 'message': message, 'data': _home_data()}
    if created_id is not None:
        response['createdId'] = str(created_id)
    return JsonResponse(response)


def _home_error(message, status=400):
    return JsonResponse({'ok': False, 'error': message}, status=status)


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')

    context = {}

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        remember_me = request.POST.get('remember_me') == 'on'
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            request.session.set_expiry(REMEMBER_ME_SECONDS if remember_me else 0)
            return redirect('home')

        context = {
            'error_message': 'Login ou senha inválidos.',
            'username': username,
            'remember_me': remember_me,
        }

    return render(request, 'pages/login.html', context)


@login_required(login_url='login')
def home_view(request):
    if request.method == 'GET':
        data = _home_data()
        return render(
            request,
            'pages/home.html',
            {
                'categorias': Categoria.objects.prefetch_related('comidas'),
                'home_data': data,
            },
        )

    if request.method != 'POST':
        return _home_error('Método não permitido.', status=405)

    try:
        payload = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return _home_error('Os dados enviados são inválidos.')

    action = payload.get('action')

    if action == 'create_category':
        title = str(payload.get('name', '')).strip()
        description = str(payload.get('description', '')).strip()

        if not title or not description:
            return _home_error('Preencha o nome e a descrição da categoria.')
        if len(title) > 100 or len(description) > 200:
            return _home_error('A categoria ultrapassa o limite de caracteres.')
        if Categoria.objects.filter(titulo__iexact=title).exists():
            return _home_error('Essa categoria já foi cadastrada.')

        max_order = Categoria.objects.aggregate(Max('ordem'))['ordem__max']
        next_order = 0 if max_order is None else max_order + 1

        try:
            categoria = Categoria.objects.create(
                titulo=title,
                texto=description,
                ordem=next_order,
            )
        except IntegrityError:
            return _home_error('Essa categoria já foi cadastrada.')

        return _home_response('Categoria criada com sucesso.', created_id=categoria.id)

    if action == 'create_coffee':
        name = str(payload.get('name', '')).strip()
        description = str(payload.get('description', '')).strip()
        image = str(payload.get('image', '')).strip()
        category_id = payload.get('categoryId')

        if not name or not description or not category_id:
            return _home_error('Preencha os campos obrigatórios do café.')
        if len(name) > 100 or len(description) > 100 or len(image) > 500:
            return _home_error('O café ultrapassa o limite de caracteres.')

        try:
            price = Decimal(str(payload.get('price', '0'))).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            return _home_error('Informe um preço válido.')

        if not price.is_finite() or price <= 0 or price > Decimal('99999.99'):
            return _home_error('O preço deve estar entre R$ 0,01 e R$ 99.999,99.')

        try:
            categoria = Categoria.objects.filter(pk=category_id).first()
        except (TypeError, ValueError):
            categoria = None
        if categoria is None:
            return _home_error('A categoria selecionada não existe.')

        if image:
            try:
                URLValidator(schemes=('http', 'https'))(image)
            except ValidationError:
                return _home_error('Informe uma URL de imagem válida.')

        cafe = Comida.objects.create(
            categoria=categoria,
            nome=name,
            preco=price,
            descricao=description,
            imagem=image,
        )
        return _home_response('Café cadastrado no cardápio.', created_id=cafe.id)

    if action == 'reorder_categories':
        raw_ids = payload.get('categoryIds')
        if not isinstance(raw_ids, list):
            return _home_error('A nova ordem das categorias é inválida.')

        try:
            ordered_ids = [int(category_id) for category_id in raw_ids]
        except (TypeError, ValueError):
            return _home_error('A nova ordem das categorias é inválida.')

        current_ids = list(Categoria.objects.values_list('id', flat=True))
        if len(ordered_ids) != len(set(ordered_ids)) or set(ordered_ids) != set(current_ids):
            return _home_error('A lista de categorias está incompleta.')

        with transaction.atomic():
            categories_by_id = Categoria.objects.in_bulk(ordered_ids)
            to_update = []
            for index, category_id in enumerate(ordered_ids):
                categoria = categories_by_id[category_id]
                categoria.ordem = index
                to_update.append(categoria)
            Categoria.objects.bulk_update(to_update, ('ordem',))

        return _home_response('Ordem das categorias atualizada.')

    if action == 'delete_category':
        try:
            categoria = Categoria.objects.filter(pk=payload.get('categoryId')).first()
        except (TypeError, ValueError):
            categoria = None
        if categoria is None:
            return _home_error('A categoria não existe.', status=404)

        title = categoria.titulo
        categoria.delete()
        return _home_response(f'Categoria “{title}” excluída do cardápio.')

    if action == 'delete_coffee':
        try:
            cafe = Comida.objects.filter(pk=payload.get('coffeeId')).first()
        except (TypeError, ValueError):
            cafe = None
        if cafe is None:
            return _home_error('O item não existe.', status=404)

        name = cafe.nome
        cafe.delete()
        return _home_response(f'“{name}” foi excluído do cardápio.')

    return _home_error('Ação desconhecida.')


def menu_view(request):
    categorias = Categoria.objects.prefetch_related('comidas')
    return render(request, 'pages/menu.html', {'categorias': categorias})
