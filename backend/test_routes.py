from app.main import app
for route in app.routes:
    if hasattr(route, 'routes'):
        for r in route.routes:
            print(f'{r.methods} {route.prefix}{r.path}')
    else:
        print(f'{route.methods} {route.path}')
