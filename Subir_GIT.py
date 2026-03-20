import subprocess
import random
import string
from datetime import datetime
import sys

def ejecutar_comando(comando):
    print(f"\n⏳ Ejecutando: {comando}")
    # Ejecutamos el comando
    resultado = subprocess.run(comando, shell=True, text=True, capture_output=True)
    
    # Imprimimos lo que responde la consola
    if resultado.stdout:
        print(resultado.stdout.strip())
    if resultado.stderr:
        print(resultado.stderr.strip())

def generar_mensaje_random():
    # Lista de prefijos típicos de programación
    prefijos = [
        "fix: ajustes y correcciones menores",
        "chore: actualizacion automatica de archivos",
        "feat: nuevas mejoras implementadas",
        "refactor: limpieza y optimizacion de codigo",
        "style: pequeños ajustes visuales o de formato",
        "update: guardado rapido de progreso"
    ]
    prefijo = random.choice(prefijos)
    
    # Añadimos la fecha, hora y un código alfanumérico corto para que sea 100% único
    fecha_hora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    codigo_random = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    return f"{prefijo} [{fecha_hora} - {codigo_random}]"

def main():
    print("🚀 --- Automatizador de GitHub (Commit Random) --- 🚀")
    
    # 1. Generar mensaje
    mensaje_commit = generar_mensaje_random()
    print(f"\n📝 Mensaje generado para este commit:\n   👉 \"{mensaje_commit}\"")
    
    # 2. Ejecutar comandos
    ejecutar_comando("git add .")
    ejecutar_comando(f'git commit -m "{mensaje_commit}"')
    ejecutar_comando("git push origin main")

    print("\n✅ ¡Listo! Los cambios se han subido a GitHub a la fuerza.")

if __name__ == "__main__":
    main()