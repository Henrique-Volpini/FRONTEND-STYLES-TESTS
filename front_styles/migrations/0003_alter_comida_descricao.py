from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('front_styles', '0002_popular_cardapio')]

    operations = [
        migrations.AlterField(
            model_name='comida',
            name='descricao',
            field=models.CharField(max_length=100),
        ),
    ]
