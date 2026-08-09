from fastapi import FastAPI, APIRouter, Form, UploadFile, File
from fastapi.testclient import TestClient

app = FastAPI()
router = APIRouter(prefix='/api/templates')

@router.post('/generate')
def generate(institute_name: str = Form(None), logo: UploadFile = File(None)): return 'gen'

@router.get('/{template_id}')
def get_template(template_id: str): return 'tpl'

app.include_router(router)

client = TestClient(app)
print(client.post('/api/templates/generate').status_code)

