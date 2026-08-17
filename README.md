# Meu Front

Aplicação Django criada para testes de UI.

Para executar a aplicação, siga os passos abaixo.

Copie e cole estes comandos no terminal:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install django
python manage.py migrate
```

Este comando serve para criar seu usuário de acesso pelo terminal:

```powershell
python manage.py createsuperuser
```

Por fim, execute:

```powershell
python manage.py runserver
```

Depois, acesse a página em http://127.0.0.1:8000/ pelo navegador.
