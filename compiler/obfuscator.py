import sys
import random

def encrypt_payload(input_path, output_path):
    with open(input_path, 'rb') as f:
        data = f.read()

    # Generate a random 16-byte key for polymorphism
    key = bytes([random.randint(0, 255) for _ in range(16)])

    # Apply custom rolling XOR encryption
    encrypted = bytearray()
    for i, byte in enumerate(data):
        encrypted.append(byte ^ key[i % len(key)])

    # Prepend the key to the encrypted payload and write to disk
    with open(output_path, 'wb') as f:
        f.write(key)
        f.write(encrypted)
        
    print(f"[Obfuscator] Applied polymorphic encryption. Payload size: {len(encrypted)} bytes")

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        encrypt_payload(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python -m compiler.obfuscator <in.json> <out.enc>")