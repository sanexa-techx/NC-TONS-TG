import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ART_DIR = r"C:\Users\USER\.gemini\antigravity-ide\brain\179ce20b-908f-45b0-a146-cbb2c5085410"
OUT_DIR = r"c:\Users\USER\OneDrive\NC TONS TG\telegram_photos"
os.makedirs(OUT_DIR, exist_ok=True)

# Load fonts
try:
    font_badge = ImageFont.truetype("segoeuib.ttf", 10)
    font_title = ImageFont.truetype("segoeuib.ttf", 23)
    font_subtitle = ImageFont.truetype("segoeui.ttf", 12)
    font_item_title = ImageFont.truetype("segoeuib.ttf", 12)
    font_item_desc = ImageFont.truetype("segoeui.ttf", 10)
    font_footer = ImageFont.truetype("segoeuib.ttf", 9)
except Exception:
    font_badge = ImageFont.load_default()
    font_title = ImageFont.load_default()
    font_subtitle = ImageFont.load_default()
    font_item_title = ImageFont.load_default()
    font_item_desc = ImageFont.load_default()
    font_footer = ImageFont.load_default()

def create_base_canvas(accent_theme="gold"):
    """Creates a sleek 640x360 cyberpunk dark gradient background with accent lighting."""
    canvas = Image.new("RGBA", (640, 360), (7, 10, 16, 255))
    draw = ImageDraw.Draw(canvas)

    # 1. Subtle diagonal gradient
    for y in range(360):
        factor = y / 360.0
        r = int(7 + 10 * factor)
        g = int(10 + 12 * factor)
        b = int(16 + 22 * factor)
        draw.line([(0, y), (640, y)], fill=(r, g, b, 255))

    # 2. Glowing radial accents
    glow = Image.new("RGBA", (640, 360), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)

    if accent_theme == "gold":
        accent_color = (245, 158, 11, 40)
        secondary_color = (0, 152, 234, 30)
    elif accent_theme == "cyan":
        accent_color = (0, 152, 234, 45)
        secondary_color = (168, 85, 247, 30)
    elif accent_theme == "purple":
        accent_color = (168, 85, 247, 45)
        secondary_color = (0, 152, 234, 35)
    elif accent_theme == "green":
        accent_color = (16, 185, 129, 45)
        secondary_color = (245, 158, 11, 30)
    else:
        accent_color = (0, 152, 234, 45)
        secondary_color = (245, 158, 11, 35)

    # Top-left ambient glow
    glow_draw.ellipse([(-80, -80), (280, 280)], fill=accent_color)
    # Bottom-right ambient glow
    glow_draw.ellipse([(400, 140), (750, 480)], fill=secondary_color)

    # Blur glow layer
    glow = glow.filter(ImageFilter.GaussianBlur(55))
    canvas = Image.alpha_composite(canvas, glow)

    # Subtle tech grid dots
    draw = ImageDraw.Draw(canvas)
    for x in range(20, 620, 24):
        for y in range(20, 340, 24):
            draw.point((x, y), fill=(255, 255, 255, 14))

    return canvas

def crop_screen_from_artifact(img_name, y_offset=0, crop_height_ratio=1.0):
    """Crops the centered mobile phone UI from the artifact screenshots."""
    path = os.path.join(ART_DIR, img_name)
    if not os.path.exists(path):
        return None
    raw = Image.open(path).convert("RGBA")
    w, h = raw.size
    cx = w // 2
    phone_w = 425
    x1 = cx - phone_w // 2
    x2 = cx + phone_w // 2

    # Crop vertical region
    start_y = int(y_offset)
    end_y = int(min(h, start_y + (h - start_y) * crop_height_ratio))
    cropped = raw.crop((x1, start_y, x2, end_y))
    return cropped

def build_phone_mockup(screen_img, target_h=315, accent_border=(234, 179, 8, 180)):
    """Builds an elegant smartphone mockup containing the screen image."""
    aspect = screen_img.width / screen_img.height
    target_w = int(target_h * aspect)

    # Scale screen image
    screen_scaled = screen_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    # Outer bezel dimensions
    border_px = 5
    outer_w = target_w + border_px * 2
    outer_h = target_h + border_px * 2
    corner_r = 20

    # Create mockup canvas with extra space for shadow
    pad = 15
    mockup = Image.new("RGBA", (outer_w + pad * 2, outer_h + pad * 2), (0, 0, 0, 0))
    mdraw = ImageDraw.Draw(mockup)

    # Drop shadow
    shadow_mask = Image.new("RGBA", mockup.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_mask)
    sdraw.rounded_rectangle(
        [(pad + 2, pad + 6), (pad + outer_w - 2, pad + outer_h + 6)],
        radius=corner_r + 2,
        fill=(0, 0, 0, 160)
    )
    shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(12))
    mockup = Image.alpha_composite(mockup, shadow_mask)
    mdraw = ImageDraw.Draw(mockup)

    # Outer bezel (dark sleek metal)
    mdraw.rounded_rectangle(
        [(pad, pad), (pad + outer_w, pad + outer_h)],
        radius=corner_r,
        fill=(18, 24, 38, 255),
        outline=accent_border,
        width=2
    )

    # Screen mask with rounded corners
    screen_mask = Image.new("L", (target_w, target_h), 0)
    s_mask_draw = ImageDraw.Draw(screen_mask)
    s_mask_draw.rounded_rectangle([(0, 0), (target_w, target_h)], radius=corner_r - 4, fill=255)

    # Paste screen image
    mockup.paste(screen_scaled, (pad + border_px, pad + border_px), screen_mask)

    # Notch / Dynamic Island pill
    notch_w = 42
    notch_h = 7
    notch_x = pad + (outer_w - notch_w) // 2
    notch_y = pad + border_px + 4
    mdraw = ImageDraw.Draw(mockup)
    mdraw.rounded_rectangle([(notch_x, notch_y), (notch_x + notch_w, notch_y + notch_h)], radius=3, fill=(10, 14, 22, 230))

    return mockup

def render_showcase_card(
    badge_text,
    badge_color,
    title_text,
    subtitle_text,
    features,
    artifact_name,
    accent_theme,
    border_accent,
    y_offset=10,
    crop_ratio=1.0,
    footer_text="⚡ TELEGRAM MINI APP • VERIFIED MINING RIG"
):
    canvas = create_base_canvas(accent_theme)
    draw = ImageDraw.Draw(canvas)

    # 1. Badge Pill (Left Column)
    badge_x = 30
    badge_y = 28
    badge_w = int(draw.textlength(badge_text, font=font_badge)) + 20
    badge_h = 22
    draw.rounded_rectangle(
        [(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)],
        radius=11,
        fill=(badge_color[0], badge_color[1], badge_color[2], 30),
        outline=(badge_color[0], badge_color[1], badge_color[2], 120),
        width=1
    )
    draw.ellipse([(badge_x + 8, badge_y + 8), (badge_x + 14, badge_y + 14)], fill=badge_color)
    draw.text((badge_x + 20, badge_y + 4), badge_text, fill=(255, 255, 255), font=font_badge)

    # 2. Main Title & Subtitle
    title_y = badge_y + 30
    draw.text((badge_x, title_y), title_text, fill=(255, 255, 255), font=font_title)
    
    sub_y = title_y + 32
    draw.text((badge_x, sub_y), subtitle_text, fill=(148, 163, 184), font=font_subtitle)

    # 3. Features List
    item_y = sub_y + 30
    for icon_char, item_head, item_sub in features:
        # Icon bullet
        draw.rounded_rectangle(
            [(badge_x, item_y + 1), (badge_x + 22, item_y + 23)],
            radius=6,
            fill=(badge_color[0], badge_color[1], badge_color[2], 25),
            outline=(badge_color[0], badge_color[1], badge_color[2], 80),
            width=1
        )
        draw.text((badge_x + 5, item_y + 4), icon_char, fill=badge_color, font=font_item_title)

        # Title & Subtitle
        draw.text((badge_x + 30, item_y), item_head, fill=(241, 245, 249), font=font_item_title)
        draw.text((badge_x + 30, item_y + 16), item_sub, fill=(100, 116, 139), font=font_item_desc)

        item_y += 38

    # 4. Footer Pill
    foot_y = 318
    draw.text((badge_x, foot_y), footer_text, fill=(100, 116, 139), font=font_footer)

    # 5. Right Column: Phone Mockup
    screen_crop = crop_screen_from_artifact(artifact_name, y_offset, crop_ratio)
    if screen_crop:
        mockup = build_phone_mockup(screen_crop, target_h=315, accent_border=border_accent)
        # Position phone centered in right half
        mx = 640 - mockup.width - 25
        my = (360 - mockup.height) // 2 + 2
        canvas.paste(mockup, (mx, my), mockup)

    return canvas.convert("RGB")

def run_generation():
    cards = [
        {
            'filename': '01_cover_nc_tons_640x360.png',
            'badge_text': 'TELEGRAM MINI APP',
            'badge_color': (245, 158, 11),
            'title_text': 'NC TONs MINING RIG',
            'subtitle_text': 'Next-Gen Telegram Crypto Mining Platform',
            'features': [
                ('💎', 'Mine Real TON Online & Offline', 'Passive hashrate minting direct to user balance'),
                ('🪙', 'Dual Currency Economy (NC & TON)', 'Earn NC fuel coins and real Telegram TON tokens'),
                ('⚡', 'Instant Withdrawals & Fast Payouts', 'Connect any TON wallet for direct payouts'),
            ],
            'artifact_name': 'dashboard_view_1790137751782.png',
            'accent_theme': 'gold',
            'border_accent': (245, 158, 11, 200),
            'y_offset': 10,
            'crop_ratio': 1.0,
            'footer_text': '⚡ BOTFATHER READY • 640x360 PIXELS • OFFICIAL APP COVER'
        },
        {
            'filename': '02_mining_dashboard_640x360.png',
            'badge_text': '24/7 ACTIVE RIG',
            'badge_color': (0, 152, 234),
            'title_text': 'PASSIVE TON MINING',
            'subtitle_text': 'Autonomous High-Yield Mining Hashrate',
            'features': [
                ('🔋', 'Battery Power Capacity', 'Maintain continuous uptime with simple recharge'),
                ('📈', 'Upgradeable Rig & Miner Level', 'Boost minting rate with higher operator tiers'),
                ('📊', 'Live Telemetry & Balances', 'Real-time counters synced with backend ledger'),
            ],
            'artifact_name': 'dashboard_claimed_post_state_1790138471770.png',
            'accent_theme': 'cyan',
            'border_accent': (0, 152, 234, 220),
            'y_offset': 10,
            'crop_ratio': 1.0,
            'footer_text': '💎 REAL CRYPTO MINING RIG • SCREENSHOT 1'
        },
        {
            'filename': '03_daily_streak_jackpot_640x360.png',
            'badge_text': '7-DAY STREAK',
            'badge_color': (234, 179, 8),
            'title_text': 'DAILY REWARDS & JACKPOT',
            'subtitle_text': 'Claim Ascending Crypto Bounties Every Day',
            'features': [
                ('🎁', 'Ascending Daily Rewards', 'Free NC coin bonuses every 24 calendar hours'),
                ('🏆', 'Day 7 Grand Jackpot Bonus', 'Mega TON payout reward on 7th check-in'),
                ('⏰', 'UTC Midnight Auto-Reset', 'Never lose your progress with streak protections'),
            ],
            'artifact_name': 'initial_load_modal_1790137641185.png',
            'accent_theme': 'gold',
            'border_accent': (234, 179, 8, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '🎁 DAILY CLAIM BONUS • SCREENSHOT 2'
        },
        {
            'filename': '04_missions_tasks_ads_640x360.png',
            'badge_text': 'EARN TASKS & ADS',
            'badge_color': (168, 85, 247),
            'title_text': 'COMMUNITY BOUNTIES',
            'subtitle_text': 'Earn Extra NC & TON Coins via Social Tasks',
            'features': [
                ('🎯', 'Telegram & Social Missions', 'Join partner channels, groups, and sponsor links'),
                ('🛡️', 'Strict 10s Verification Gate', 'Fair engagement verification for all miners'),
                ('📺', 'Watch Sponsored Clips', 'Instant TON rewards from Adsgram & Monetag'),
            ],
            'artifact_name': 'ad_missions_section_1790156186576.png',
            'accent_theme': 'purple',
            'border_accent': (168, 85, 247, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '🎯 TASKS & AD REWARDS • SCREENSHOT 3'
        },
        {
            'filename': '05_ton_wallet_withdraw_640x360.png',
            'badge_text': 'TON CONNECT INTEGRATED',
            'badge_color': (16, 185, 129),
            'title_text': 'INSTANT TON PAYOUTS',
            'subtitle_text': 'Direct Non-Custodial Withdrawals',
            'features': [
                ('💎', 'Tonkeeper / Telegram Wallet', 'One-tap connection via official TON Connect'),
                ('🔒', 'Withdrawal Protection Gate', 'Complete daily ad missions to unlock payouts'),
                ('📢', 'Public Proofs Channel', 'All approved payouts posted live on Telegram'),
            ],
            'artifact_name': 'netlify_wallet_clean_promo_1790187037835.png',
            'accent_theme': 'green',
            'border_accent': (16, 185, 129, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '💳 TON CONNECT WITHDRAWAL • SCREENSHOT 4'
        },
        {
            'filename': '06_arcade_games_arena_640x360.png',
            'badge_text': 'ARCADE ARENA',
            'badge_color': (244, 63, 94),
            'title_text': 'PLAY-TO-EARN GAMES',
            'subtitle_text': '3 Skill-Based Arcade Games with Rewards',
            'features': [
                ('🧠', 'Memory Matrix Challenge', 'Match 6 pairs under 45 seconds for NC & TON'),
                ('🔢', '2048 Crypto Tile Merge', 'Combine tiles to reach 1,000 score bounty'),
                ('🏎️', 'Cyber Car Speedway Race', 'Dodge traffic & collect batteries to win'),
            ],
            'artifact_name': 'missions_marketplace_preview_1790152461047.png',
            'accent_theme': 'cyan',
            'border_accent': (244, 63, 94, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '🎮 ARCADE ARENA GAMES • SCREENSHOT 5'
        }
    ]

def render_direct_ui_card(artifact_name, title_badge, y_offset=0, crop_ratio=1.0):
    """Renders a centered direct UI screenshot with blurred ambient backdrop."""
    canvas = Image.new("RGBA", (640, 360), (7, 10, 16, 255))
    screen_crop = crop_screen_from_artifact(artifact_name, y_offset, crop_ratio)
    if not screen_crop:
        return canvas.convert("RGB")

    # 1. Ambient blurred background using the app screen
    bg = screen_crop.resize((640, 360), Image.Resampling.BILINEAR)
    bg = bg.filter(ImageFilter.GaussianBlur(35))
    # Dark overlay
    dark_overlay = Image.new("RGBA", (640, 360), (5, 8, 14, 175))
    bg = Image.alpha_composite(bg, dark_overlay)
    canvas = bg

    # 2. Centered phone mockup
    mockup = build_phone_mockup(screen_crop, target_h=330, accent_border=(245, 158, 11, 140))
    mx = (640 - mockup.width) // 2
    my = (360 - mockup.height) // 2
    canvas.paste(mockup, (mx, my), mockup)

    # 3. Top Header Pill
    draw = ImageDraw.Draw(canvas)
    badge_w = int(draw.textlength(title_badge, font=font_badge)) + 24
    bx = (640 - badge_w) // 2
    by = 12
    draw.rounded_rectangle(
        [(bx, by), (bx + badge_w, by + 20)],
        radius=10,
        fill=(10, 14, 22, 210),
        outline=(245, 158, 11, 140),
        width=1
    )
    draw.text((bx + 12, by + 4), title_badge, fill=(245, 158, 11), font=font_badge)

    return canvas.convert("RGB")

def run_generation():
    cards = [
        {
            'filename': '01_cover_nc_tons_640x360.png',
            'badge_text': 'TELEGRAM MINI APP',
            'badge_color': (245, 158, 11),
            'title_text': 'NC TONs MINING RIG',
            'subtitle_text': 'Next-Gen Telegram Crypto Mining Platform',
            'features': [
                ('💎', 'Mine Real TON Online & Offline', 'Passive hashrate minting direct to user balance'),
                ('🪙', 'Dual Currency Economy (NC & TON)', 'Earn NC fuel coins and real Telegram TON tokens'),
                ('⚡', 'Instant Withdrawals & Fast Payouts', 'Connect any TON wallet for direct payouts'),
            ],
            'artifact_name': 'dashboard_view_1790137751782.png',
            'accent_theme': 'gold',
            'border_accent': (245, 158, 11, 200),
            'y_offset': 10,
            'crop_ratio': 1.0,
            'footer_text': '⚡ BOTFATHER READY • 640x360 PIXELS • OFFICIAL APP COVER'
        },
        {
            'filename': '02_mining_dashboard_640x360.png',
            'badge_text': '24/7 ACTIVE RIG',
            'badge_color': (0, 152, 234),
            'title_text': 'PASSIVE TON MINING',
            'subtitle_text': 'Autonomous High-Yield Mining Hashrate',
            'features': [
                ('🔋', 'Battery Power Capacity', 'Maintain continuous uptime with simple recharge'),
                ('📈', 'Upgradeable Rig & Miner Level', 'Boost minting rate with higher operator tiers'),
                ('📊', 'Live Telemetry & Balances', 'Real-time counters synced with backend ledger'),
            ],
            'artifact_name': 'dashboard_claimed_post_state_1790138471770.png',
            'accent_theme': 'cyan',
            'border_accent': (0, 152, 234, 220),
            'y_offset': 10,
            'crop_ratio': 1.0,
            'footer_text': '💎 REAL CRYPTO MINING RIG • SCREENSHOT 1'
        },
        {
            'filename': '03_daily_streak_jackpot_640x360.png',
            'badge_text': '7-DAY STREAK',
            'badge_color': (234, 179, 8),
            'title_text': 'DAILY REWARDS & JACKPOT',
            'subtitle_text': 'Claim Ascending Crypto Bounties Every Day',
            'features': [
                ('🎁', 'Ascending Daily Rewards', 'Free NC coin bonuses every 24 calendar hours'),
                ('🏆', 'Day 7 Grand Jackpot Bonus', 'Mega TON payout reward on 7th check-in'),
                ('⏰', 'UTC Midnight Auto-Reset', 'Never lose your progress with streak protections'),
            ],
            'artifact_name': 'initial_load_modal_1790137641185.png',
            'accent_theme': 'gold',
            'border_accent': (234, 179, 8, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '🎁 DAILY CLAIM BONUS • SCREENSHOT 2'
        },
        {
            'filename': '04_missions_tasks_ads_640x360.png',
            'badge_text': 'EARN TASKS & ADS',
            'badge_color': (168, 85, 247),
            'title_text': 'COMMUNITY BOUNTIES',
            'subtitle_text': 'Earn Extra NC & TON Coins via Social Tasks',
            'features': [
                ('🎯', 'Telegram & Social Missions', 'Join partner channels, groups, and sponsor links'),
                ('🛡️', 'Strict 10s Verification Gate', 'Fair engagement verification for all miners'),
                ('📺', 'Watch Sponsored Clips', 'Instant TON rewards from Adsgram & Monetag'),
            ],
            'artifact_name': 'ad_missions_section_1790156186576.png',
            'accent_theme': 'purple',
            'border_accent': (168, 85, 247, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '🎯 TASKS & AD REWARDS • SCREENSHOT 3'
        },
        {
            'filename': '05_ton_wallet_withdraw_640x360.png',
            'badge_text': 'TON CONNECT INTEGRATED',
            'badge_color': (16, 185, 129),
            'title_text': 'INSTANT TON PAYOUTS',
            'subtitle_text': 'Direct Non-Custodial Withdrawals',
            'features': [
                ('💎', 'Tonkeeper / Telegram Wallet', 'One-tap connection via official TON Connect'),
                ('🔒', 'Withdrawal Protection Gate', 'Complete daily ad missions to unlock payouts'),
                ('📢', 'Public Proofs Channel', 'All approved payouts posted live on Telegram'),
            ],
            'artifact_name': 'netlify_wallet_clean_promo_1790187037835.png',
            'accent_theme': 'green',
            'border_accent': (16, 185, 129, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '💳 TON CONNECT WITHDRAWAL • SCREENSHOT 4'
        },
        {
            'filename': '06_arcade_games_arena_640x360.png',
            'badge_text': 'ARCADE ARENA',
            'badge_color': (244, 63, 94),
            'title_text': 'PLAY-TO-EARN GAMES',
            'subtitle_text': '3 Skill-Based Arcade Games with Rewards',
            'features': [
                ('🧠', 'Memory Matrix Challenge', 'Match 6 pairs under 45 seconds for NC & TON'),
                ('🔢', '2048 Crypto Tile Merge', 'Combine tiles to reach 1,000 score bounty'),
                ('🏎️', 'Cyber Car Speedway Race', 'Dodge traffic & collect batteries to win'),
            ],
            'artifact_name': 'missions_marketplace_preview_1790152461047.png',
            'accent_theme': 'cyan',
            'border_accent': (244, 63, 94, 220),
            'y_offset': 0,
            'crop_ratio': 1.0,
            'footer_text': '🎮 ARCADE ARENA GAMES • SCREENSHOT 5'
        }
    ]

    for c in cards:
        img = render_showcase_card(
            badge_text=c['badge_text'],
            badge_color=c['badge_color'],
            title_text=c['title_text'],
            subtitle_text=c['subtitle_text'],
            features=c['features'],
            artifact_name=c['artifact_name'],
            accent_theme=c['accent_theme'],
            border_accent=c['border_accent'],
            y_offset=c['y_offset'],
            crop_ratio=c['crop_ratio'],
            footer_text=c['footer_text']
        )
        out_path = os.path.join(OUT_DIR, c['filename'])
        img.save(out_path, quality=95)
        # Also copy to artifacts directory
        art_out_path = os.path.join(ART_DIR, c['filename'])
        img.save(art_out_path, quality=95)
        print(f"Generated {c['filename']} -> {img.size}")

    # Generate Direct Centered UI cards
    direct_cards = [
        ('07_direct_ui_dashboard_640x360.png', 'dashboard_view_1790137751782.png', '⛏️ NC TONs MINING DASHBOARD', 10, 1.0),
        ('08_direct_ui_daily_streak_640x360.png', 'initial_load_modal_1790137641185.png', '🎁 7-DAY STREAK & JACKPOT MODAL', 0, 1.0),
        ('09_direct_ui_tasks_marketplace_640x360.png', 'missions_marketplace_preview_1790152461047.png', '🎯 TASKS & MISSIONS MARKETPLACE', 0, 1.0),
        ('10_direct_ui_ton_wallet_640x360.png', 'netlify_wallet_clean_promo_1790187037835.png', '💎 TON CONNECT WALLET & CASHOUT', 0, 1.0),
    ]

    for fname, art_name, badge_label, y_off, c_ratio in direct_cards:
        d_img = render_direct_ui_card(art_name, badge_label, y_off, c_ratio)
        out_path = os.path.join(OUT_DIR, fname)
        d_img.save(out_path, quality=95)
        art_out_path = os.path.join(ART_DIR, fname)
        d_img.save(art_out_path, quality=95)
        print(f"Generated {fname} -> {d_img.size}")

if __name__ == '__main__':
    run_generation()


