import json

with open('data/games_database.json', 'r', encoding='utf-8') as f:
    games = json.load(f)

print(f"Total games loaded: {len(games)}")
coming_soon = [g for g in games if g.get('status') == 'Coming Soon']
print(f"Coming Soon games count: {len(coming_soon)}")
for cg in coming_soon:
    print(f"  * [{cg['status']}] {cg['name']} ({cg['release_year']}) - Storage: {cg['storage_gb']}GB (SSD: {cg['requires_ssd']})")
    print(f"    Min GPU: {cg['min_gpu']} | Rec GPU: {cg['rec_gpu']}")
    print(f"    Community/iGPU: {cg['community_notes']}")

print("\nSample Released Popular Games:")
for title in ['Cyberpunk 2077', 'Grand Theft Auto V', 'Black Myth: Wukong', 'Elden Ring', 'Counter-Strike 2', 'Baldur\'s Gate 3']:
    found = [g for g in games if title.lower() in g['name'].lower()]
    if found:
        g = found[0]
        print(f"  * {g['name']} ({g['release_year']}) - Storage: {g['storage_gb']}GB (SSD: {g['requires_ssd']})")
        print(f"    Min RAM: {g['min_ram_gb']}GB | Rec RAM: {g['rec_ram_gb']}GB")
        print(f"    Min GPU: {g['min_gpu']} (G3D: {g['min_gpu_g3d']})")
        print(f"    Rec GPU: {g['rec_gpu']} (G3D: {g['rec_gpu_g3d']})")
        print(f"    iGPU Tier: {g['igpu_tier']} | FSR: {g['supports_fsr']} | XeSS: {g['supports_xess']}")
        print(f"    Steam: {g['steam_url']}")
        print(f"    Epic: {g['epic_url']}")
        print(f"    Community Note: {g['community_notes']}")
