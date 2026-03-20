import subprocess
import sys

def ejecutar_comando(comando):
    print(f"\n⏳ Ejecutando: {comando}")
    try:
        # Ejecuta el comando en la consola
        resultado = subprocess.run(comando, shell=True, check=True, text=True, capture_output=True)
        # Muestra la respuesta exitosa de la consola
        if resultado.stdout.strip():
            print(resultado.stdout.strip())
    except subprocess.CalledProcessError as e:
        # Si algo falla (ej. no hay cambios para subir), lo muestra en rojo/error
        print(f"❌ Error al ejecutar: {comando}")
        if e.stdout:
            print(e.stdout.strip())
        if e.stderr:
            print(e.stderr.strip())
        
        # Si el error es porque no hay cambios en el commit, no detenemos el script de golpe
        if "nothing to commit" in e.stdout or "nothing to commit" in e.stderr:
            print("⚠️ Parece que no hay cambios nuevos guardados para subir.")
        sys.exit(1)

def main():
    print("🚀 --- Automatizador de GitHub (Likering) --- 🚀")
    
    # 1. Pedir el mensaje del commit al usuario
    mensaje_commit = input("\n📝 Escribe el mensaje para este commit: ").strip()
    
    if not mensaje_commit:
        print("⚠️ El mensaje no puede estar vacío. Operación cancelada.")
        sys.exit(1)

    # 2. Ejecutar los comandos en orden
    ejecutar_comando("git add .")
    ejecutar_comando(f'git commit -m "{mensaje_commit}"')
    ejecutar_comando("git push origin main")

    print("\n✅ ¡Listo! Los cambios se han subido a GitHub (y Render ya debe estar actualizando).")

if __name__ == "__main__":
    main()