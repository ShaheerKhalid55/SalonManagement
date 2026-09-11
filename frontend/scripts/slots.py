import requests
from datetime import date, timedelta

# ============================================================
# CONFIGURATION
# ============================================================

API_URL = "https://salonmanagement.fastapicloud.dev/api/v1/slots"

# If your API requires authentication, put your token here.
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjoxNzg5MTU4OTExfQ.87b1kmbDmslrWRDzXD9VO5YYnDCNBeJijI8HMTbvjPA"

# Salon -> Agent mapping
SALONS = {
    1: 3,   # Glow Beauty Studio -> Agent 3
    2: 5,   # Bella Salon & Spa -> CHANGE 4 to actual Salon 2 agent
}

# Salon working hours
SALON_HOURS = {
    1: ("10:00:00", "22:00:00"),  # 10 AM - 10 PM
    2: ("10:00:00", "21:00:00"),  # 10 AM - 9 PM
}

# 1-hour slots
SLOT_DURATION_HOURS = 1


# ============================================================
# DATE RANGE
# Today -> End of current month
# ============================================================

today = date.today()

next_month = (
    today.replace(day=28) + timedelta(days=4)
).replace(day=1)

last_day_of_month = next_month - timedelta(days=1)


# ============================================================
# HELPERS
# ============================================================

def time_to_minutes(time_string):
    h, m, s = map(int, time_string.split(":"))
    return h * 60 + m


def minutes_to_time(total_minutes):
    hours = total_minutes // 60
    minutes = total_minutes % 60

    return f"{hours:02d}:{minutes:02d}:00"


def create_slot(salon_id, agent_id, slot_date, start_time, end_time):

    payload = {
        "salon_id": salon_id,
        "agent_id": agent_id,
        "slot_date": slot_date,
        "start_time": start_time,
        "end_time": end_time,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TOKEN}",
    }

    response = requests.post(
        API_URL,
        json=payload,
        headers=headers,
        timeout=30,
    )

    if response.status_code in (200, 201):
        print(
            f"✓ Salon {salon_id} | "
            f"{slot_date} | "
            f"{start_time} - {end_time}"
        )
        return True

    print(
        f"✗ Salon {salon_id} | "
        f"{slot_date} | "
        f"{start_time} - {end_time} | "
        f"{response.status_code} | "
        f"{response.text}"
    )

    return False


# ============================================================
# CREATE SLOTS
# ============================================================

current_date = today

total_created = 0
total_failed = 0

while current_date <= last_day_of_month:

    date_string = current_date.isoformat()

    for salon_id, agent_id in SALONS.items():

        opening_time, closing_time = SALON_HOURS[salon_id]

        start_minutes = time_to_minutes(opening_time)
        closing_minutes = time_to_minutes(closing_time)

        current_minutes = start_minutes

        while current_minutes + (SLOT_DURATION_HOURS * 60) <= closing_minutes:

            start_time = minutes_to_time(current_minutes)

            end_time = minutes_to_time(
                current_minutes + SLOT_DURATION_HOURS * 60
            )

            success = create_slot(
                salon_id=salon_id,
                agent_id=agent_id,
                slot_date=date_string,
                start_time=start_time,
                end_time=end_time,
            )

            if success:
                total_created += 1
            else:
                total_failed += 1

            current_minutes += SLOT_DURATION_HOURS * 60

    current_date += timedelta(days=1)


# ============================================================
# SUMMARY
# ============================================================

print()
print("======================================")
print("Slot creation completed")
print("======================================")
print(f"From       : {today}")
print(f"To         : {last_day_of_month}")
print(f"Created    : {total_created}")
print(f"Failed     : {total_failed}")
print("======================================")