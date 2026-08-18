from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .models import Categoria


REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60


def login_view(request):
    if request.user.is_authenticated:
        return redirect('menu')

    context = {}

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        remember_me = request.POST.get('remember_me') == 'on'
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            request.session.set_expiry(REMEMBER_ME_SECONDS if remember_me else 0)
            return redirect('menu')

        context = {
            'error_message': 'Login ou senha inválidos.',
            'username': username,
            'remember_me': remember_me,
        }

    return render(request, 'pages/login.html', context)


@login_required(login_url='login')
def home_view(request):
    return redirect('home')


def menu_view(request):
    categorias = Categoria.objects.prefetch_related('comidas')
    return render(request, 'pages/menu.html', {'categorias': categorias})
