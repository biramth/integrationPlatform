import subprocess, time, urllib.request, json, threading

proc = subprocess.Popen(
    ['node', 'server.js'],
    cwd=r'C:\Users\Birame\Documents\integrationPlatform\backend',
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding='utf-8',
    errors='replace'
)
output_lines = []
def read_output():
    for line in proc.stdout:
        output_lines.append(line)
        if len(output_lines) > 100:
            break
t = threading.Thread(target=read_output, daemon=True)
t.start()
time.sleep(8)

data = json.dumps({'username': 'admin', 'password': 'administrateur'}).encode()
req = urllib.request.Request('http://localhost:3000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req, timeout=10)
token = json.loads(res.read().decode())['token']

csv_path = r'C:\Users\Birame\Downloads\Vos coordonnées.csv\Vos coordonnées.csv'
with open(csv_path, 'rb') as f:
    file_data = f.read()

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = []
body.append('--' + boundary)
body.append('Content-Disposition: form-data; name="file"; filename="test.csv"')
body.append('Content-Type: text/csv')
body.append('')
body.append(file_data.decode('utf-8'))
body.append('--' + boundary + '--')
body = '\r\n'.join(body).encode('utf-8')

req2 = urllib.request.Request(
    'http://localhost:3000/api/import/contacts-csv/preview',
    data=body,
    headers={'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Authorization': 'Bearer ' + token}
)
try:
    res2 = urllib.request.urlopen(req2, timeout=10)
    result = json.loads(res2.read().decode())
    print('Preview rows:', len(result.get('rows', [])))
except urllib.error.HTTPError as e:
    print('Preview error:', e.code, e.read().decode())
    time.sleep(2)
    with open(r'C:\Users\Birame\Documents\integrationPlatform\server_output.txt', 'w', encoding='utf-8') as f:
        for line in output_lines:
            f.write(line)

proc.terminate()
print('Done - output written to server_output.txt')
