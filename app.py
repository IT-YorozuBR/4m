
while True:
    # faz um get no endpoint https://fourm-znis.onrender.com/api/fr0062 a cada 14 minutos
    import time
    import requests
    tempo = 840 # 14 minutos em segundos

    try:
        print(f"Making GET request to https://fourm-znis.onrender.com/api/fr0062 every {tempo} seconds")
        response = requests.get("https://fourm-znis.onrender.com/api/fr0062")
        print(f"get bem sucedido! {response.status_code}")
    except Exception as e:
        print(f"Error occurred: {e}")

    time.sleep(tempo) 