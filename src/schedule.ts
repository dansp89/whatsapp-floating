import type { ScheduleConfig } from "./types";

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function parseTimeToMinutes(str: string | undefined): number | null {
    if (!str || typeof str !== "string") return null;
    const parts = str.split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0] as string, 10);
    const m = parseInt(parts[1] as string, 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
}

function nowInTimezone(timezone: string | undefined): Date {
    if (!timezone) return new Date();
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
        const parts = formatter.formatToParts(new Date());
        const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
        return new Date(
            Number(get("year")),
            Number(get("month")) - 1,
            Number(get("day")),
            Number(get("hour")) === 24 ? 0 : Number(get("hour")),
            Number(get("minute")),
            Number(get("second"))
        );
    } catch {
        return new Date();
    }
}

export function isWithinSchedule(schedule: ScheduleConfig | undefined): boolean {
    if (!schedule) return true;

    const now = nowInTimezone(schedule.timezone);
    const day = WEEKDAY_NAMES[now.getDay()];

    if (schedule.days && schedule.days.length) {
        const days = schedule.days.map((d) => String(d).toLowerCase());
        if (!day || days.indexOf(day) === -1) return false;
    }

    if (schedule.hours) {
        const current = now.getHours() * 60 + now.getMinutes();
        const start = parseTimeToMinutes(schedule.hours.start);
        const end = parseTimeToMinutes(schedule.hours.end);
        if (start != null && end != null) {
            if (start <= end) {
                if (current < start || current > end) return false;
            } else {
                // overnight range e.g. 22:00 - 06:00
                if (current < start && current > end) return false;
            }
        }
    }

    return true;
}
