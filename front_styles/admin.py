from django.contrib import admin

from .models import Categoria, Comida


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'texto')
    search_fields = ('titulo',)


@admin.register(Comida)
class ComidaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'categoria', 'preco')
    list_filter = ('categoria',)
    search_fields = ('nome', 'descricao')
