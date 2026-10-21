import os
import sys
import json
import urllib.request
import time

DATA_RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'raw')
os.makedirs(DATA_RAW_DIR, exist_ok=True)

def download_file(url, target_path, label):
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        print(f"[CACHE] {label} already exists at {target_path} ({os.path.getsize(target_path)} bytes)")
        return
    print(f"[DOWNLOAD] Downloading {label} from {url}...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as response, open(target_path, 'wb') as out_file:
        chunk_size = 64 * 1024
        downloaded = 0
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
    print(f"[DONE] Saved {label} ({downloaded} bytes) to {target_path}")

def fetch_steamspy_pages(num_pages=5):
    target_path = os.path.join(DATA_RAW_DIR, 'steamspy_top5000.json')
    if os.path.exists(target_path) and os.path.getsize(target_path) > 10000:
        print(f"[CACHE] SteamSpy data already exists ({os.path.getsize(target_path)} bytes)")
        with open(target_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    all_games = {}
    print(f"[FETCH] Sourcing top games from SteamSpy across {num_pages} pages...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    for page in range(num_pages):
        url = f"https://steamspy.com/api.php?request=all&page={page}"
        print(f"  Fetching SteamSpy page {page}...")
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=30) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    all_games.update(data)
                    print(f"    Page {page}: received {len(data)} games (Total accumulated: {len(all_games)})")
                    time.sleep(1.2)  # Respect rate limits
                    break
            except Exception as e:
                print(f"    Attempt {attempt+1} failed for page {page}: {e}")
                time.sleep(3)
    
    with open(target_path, 'w', encoding='utf-8') as f:
        json.dump(all_games, f, indent=2)
    print(f"[DONE] Saved {len(all_games)} SteamSpy games to {target_path}")
    return all_games

if __name__ == '__main__':
    # 1. PC Game Benchmarks 17,400+ games dataset
    benchmarks_url = "https://raw.githubusercontent.com/emilioagustin83/pc-game-fps-dataset/main/data/games.csv"
    benchmarks_dest = os.path.join(DATA_RAW_DIR, "pcgamebenchmarks_games.csv")
    download_file(benchmarks_url, benchmarks_dest, "PCGameBenchmarks 17,400+ Games Dataset")

    # 2. GPUs dataset with G3D Mark
    gpus_url = "https://raw.githubusercontent.com/emilioagustin83/pc-game-fps-dataset/main/data/gpus.csv"
    gpus_dest = os.path.join(DATA_RAW_DIR, "pcgamebenchmarks_gpus.csv")
    download_file(gpus_url, gpus_dest, "GPUs G3D Benchmark Dataset")

    # 3. SteamSpy Top 5,000 Games
    fetch_steamspy_pages(5)
