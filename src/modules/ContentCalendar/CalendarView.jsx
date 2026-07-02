import { useState, useMemo } from "react";
import PostCard from "./PostCard.jsx";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  // Convert to Mon = 0, Tue = 1, ..., Sun = 6
  let firstDayOfWeek = firstDay.getDay() - 1;
  if (firstDayOfWeek < 0) firstDayOfWeek = 6;

  const days = [];

  // Previous month padding
  if (firstDayOfWeek > 0) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }
  }

  // Current month days
  for (let date = 1; date <= daysInMonth; date++) {
    days.push({
      date,
      month,
      year,
      isCurrentMonth: true,
    });
  }

  // Next month padding
  const remainingCells = 7 - (days.length % 7);
  if (remainingCells < 7) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let date = 1; date <= remainingCells; date++) {
      days.push({
        date,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      });
    }
  }

  return days;
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function CalendarView({ posts, campaigns, onPostClick, onDayClick }) {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const calendarDays = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const postsByDate = useMemo(() => {
    const map = new Map();

    posts.forEach((post) => {
      if (post.scheduled_at) {
        const d = new Date(post.scheduled_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(post);
      }
    });

    return map;
  }, [posts]);

  const unscheduledPosts = useMemo(() => {
    return posts.filter((p) => !p.scheduled_at);
  }, [posts]);

  const campaignMap = useMemo(() => {
    const map = new Map();
    campaigns.forEach((c) => map.set(c.id, c));
    return map;
  }, [campaigns]);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function handleDayClick(day) {
    if (!day.isCurrentMonth) return;
    const date = new Date(day.year, day.month, day.date, 12, 0, 0);
    onDayClick(date);
  }

  return (
    <div className="cc-calendar-wrap">
      <div className="cc-calendar-header">
        <button
          type="button"
          className="cc-calendar-nav"
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
        >
          ‹
        </button>
        <h2 className="cc-calendar-title">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h2>
        <button
          type="button"
          className="cc-calendar-nav"
          onClick={nextMonth}
          aria-label="Bulan berikutnya"
        >
          ›
        </button>
      </div>

      <div className="cc-calendar-grid">
        {DAY_NAMES.map((day) => (
          <div key={day} className="cc-calendar-day-name">
            {day}
          </div>
        ))}

        {calendarDays.map((day, idx) => {
          const dayDate = new Date(day.year, day.month, day.date);
          const isToday = isSameDay(dayDate, today);
          const key = `${day.year}-${day.month}-${day.date}`;
          const dayPosts = postsByDate.get(key) || [];

          return (
            <button
              key={idx}
              type="button"
              className={`cc-calendar-cell ${
                !day.isCurrentMonth ? "cc-calendar-cell--other" : ""
              } ${isToday ? "cc-calendar-cell--today" : ""}`}
              onClick={() => handleDayClick(day)}
              aria-label={`${day.date} ${MONTH_NAMES[day.month]}, ${dayPosts.length} post`}
            >
              <span className="cc-calendar-date">{day.date}</span>
              <div className="cc-calendar-posts">
                {dayPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPostClick(post);
                    }}
                    compact
                    campaign={campaignMap.get(post.campaign_id)}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {unscheduledPosts.length > 0 && (
        <div className="cc-unscheduled">
          <h3 className="cc-unscheduled-title">Belum Dijadwalkan</h3>
          <div className="cc-unscheduled-grid">
            {unscheduledPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={onPostClick}
                campaign={campaignMap.get(post.campaign_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
