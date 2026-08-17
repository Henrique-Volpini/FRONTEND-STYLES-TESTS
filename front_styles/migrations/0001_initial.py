from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('titulo', models.CharField(max_length=100, unique=True)),
                ('texto', models.CharField(max_length=200)),
            ],
            options={'ordering': ('id',)},
        ),
        migrations.CreateModel(
            name='Comida',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=100)),
                ('preco', models.DecimalField(decimal_places=2, max_digits=7)),
                ('descricao', models.TextField(max_length=300)),
                ('imagem', models.URLField(max_length=500)),
                ('categoria', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comidas', to='front_styles.categoria')),
            ],
            options={'ordering': ('id',)},
        ),
    ]
