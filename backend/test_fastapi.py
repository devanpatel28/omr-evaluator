from fastapi import FastAPI, APIRouter
from fastapi.testclient import TestClient

app = FastAPI()
router = APIRouter(prefix='/api/templates')

@router.post('/generate')
def generate(): return 'gen'

@router.get('/{template_id}')
def get_template(template_id: str): return 'tpl'

app.include_router(router)

client = TestClient(app)
print(client.post('/api/templates/generate').status_code)

