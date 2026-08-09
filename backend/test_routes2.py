from app.main import app
from fastapi.routing import APIRoute
for route in app.routes:
    if hasattr(route, 'routes'):
        for r in route.routes:
            if isinstance(r, APIRoute):
                print(f'{r.methods} {route.prefix}{r.path}')
    elif isinstance(route, APIRoute):
        print(f'{route.methods} {route.path}')
