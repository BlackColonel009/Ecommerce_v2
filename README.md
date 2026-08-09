# New Technologies Ecommerce

Le projet contient trois applications FastAPI :

- l'API métier dans `main.py` ;
- la boutique dans `templates/ecommerce/app/main.py` ;
- le tableau de bord dans `templates/dashboard/app/main.py`.

## Installation sous Windows

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Renseigner ensuite les valeurs réelles dans `.env`. Ce fichier contient les secrets et ne doit jamais être ajouté à Git.

## Lancement local

Ouvrir trois terminaux à la racine du projet :

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
.\.venv\Scripts\python.exe -m uvicorn templates.ecommerce.app.main:app --reload --port 8001
.\.venv\Scripts\python.exe -m uvicorn templates.dashboard.app.main:app --reload --port 8002
```

- API et documentation : <http://localhost:8000/docs>
- Boutique : <http://localhost:8001>
- Administration : <http://localhost:8002>

## Vérifications

```powershell
.\.venv\Scripts\python.exe -m compileall -q main.py models routes schemas script utils
.\.venv\Scripts\python.exe -m pytest -q
```

## Production Linux

Les scripts `setup_ecommerce_services.sh` et `setup_nginx.sh` utilisent les ports 8100, 8200 et 8300. Créer l'environnement `.venv` directement sur le serveur avant d'installer les services ; un environnement virtuel Windows ne peut pas être copié vers Linux.
