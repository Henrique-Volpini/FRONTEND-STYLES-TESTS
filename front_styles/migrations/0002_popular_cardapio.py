from django.db import migrations


CATEGORIAS = (
    (
        'Cafés clássicos',
        'O essencial, bem feito.',
        (
            ('Espresso', '7.00', 'Curto, intenso e encorpado.', 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=600&q=80'),
            ('Espresso duplo', '10.00', 'Duas doses para um sabor mais marcante.', 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?auto=format&fit=crop&w=600&q=80'),
            ('Café coado', '9.00', 'Extração suave feita na hora.', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80'),
            ('Americano', '9.00', 'Espresso alongado com água quente.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'),
        ),
    ),
    (
        'Cafés com leite',
        'Cremosos e aconchegantes.',
        (
            ('Cappuccino', '14.00', 'Espresso, leite vaporizado e espuma cremosa.', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80'),
            ('Latte', '15.00', 'Espresso suave com bastante leite vaporizado.', 'https://images.unsplash.com/photo-1561047029-3000c68339ca?auto=format&fit=crop&w=600&q=80'),
            ('Mocha', '17.00', 'Espresso, chocolate e leite cremoso.', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80'),
            ('Macchiato', '11.00', 'Espresso marcado com um toque de espuma.', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80'),
        ),
    ),
    (
        'Cafés gelados',
        'Refrescantes em qualquer hora.',
        (
            ('Iced latte', '16.00', 'Espresso, leite e gelo.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80'),
            ('Cold brew', '15.00', 'Extração a frio, leve e naturalmente doce.', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80'),
            ('Affogato', '18.00', 'Gelato de baunilha servido com espresso.', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80'),
        ),
    ),
    (
        'Acompanhamentos',
        'Para completar a pausa.',
        (
            ('Croissant', '12.00', 'Massa folhada leve e amanteigada.', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80'),
            ('Pão de queijo', '9.00', 'Porção com três unidades.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'),
            ('Bolo do dia', '13.00', 'Consulte o sabor disponível.', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80'),
            ('Cookie de chocolate', '10.00', 'Crocante por fora e macio por dentro.', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80'),
        ),
    ),
)


def popular_cardapio(apps, schema_editor):
    Categoria = apps.get_model('front_styles', 'Categoria')
    Comida = apps.get_model('front_styles', 'Comida')

    for titulo, texto, comidas in CATEGORIAS:
        categoria = Categoria.objects.create(titulo=titulo, texto=texto)
        Comida.objects.bulk_create(
            [
                Comida(
                    categoria=categoria,
                    nome=nome,
                    preco=preco,
                    descricao=descricao,
                    imagem=imagem,
                )
                for nome, preco, descricao, imagem in comidas
            ]
        )


def remover_cardapio(apps, schema_editor):
    Categoria = apps.get_model('front_styles', 'Categoria')
    titulos = [categoria[0] for categoria in CATEGORIAS]
    Categoria.objects.filter(titulo__in=titulos).delete()


class Migration(migrations.Migration):
    dependencies = [('front_styles', '0001_initial')]

    operations = [migrations.RunPython(popular_cardapio, remover_cardapio)]
