from django.db import models


class Categoria(models.Model):
    titulo = models.CharField(max_length=100, unique=True)
    texto = models.CharField(max_length=200)

    class Meta:
        ordering = ('id',)

    def __str__(self):
        return self.titulo


class Comida(models.Model):
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.CASCADE,
        related_name='comidas',
    )
    nome = models.CharField(max_length=100)
    preco = models.DecimalField(max_digits=7, decimal_places=2)
    descricao = models.CharField(max_length=100)
    imagem = models.URLField(max_length=500)

    class Meta:
        ordering = ('id',)

    def __str__(self):
        return self.nome
