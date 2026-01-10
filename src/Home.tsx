import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";
import dotenv from 'dotenv'
dotenv.config()

type DayKey = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

type ClassStatus = "pending" | "attended" | "absent" | "cancelled";

interface RoutineClass {
  id: string;
  courseName: string;
  label: string;
}

const API_BASE = process.env.VITE_API_BASE || "http://localhost:3002";

const ROUTINE: Record<DayKey, RoutineClass[]> = {
  Monday: [
    { id: "mon-coi", courseName: "CoI", label: "CoI" },
    { id: "mon-es-lab", courseName: "ES_lab", label: "ES_lab" },
    { id: "mon-cd", courseName: "CD", label: "CD" },
    { id: "mon-bct", courseName: "BCT", label: "BCT" },
  ],
  Tuesday: [
    { id: "tue-aiml-lab", courseName: "AIML_lab", label: "AIML_lab" },
  ],
  Wednesday: [
    { id: "wed-cd-lab", courseName: "CD_lab", label: "CD_lab" },
    { id: "wed-aiml", courseName: "AIML", label: "AIML" },
    { id: "wed-cd", courseName: "CD", label: "CD" },
  ],
  Thursday: [
    { id: "thu-aiml", courseName: "AIML", label: "AIML" },
    { id: "thu-cd", courseName: "CD", label: "CD" },
    { id: "thu-bct", courseName: "BCT", label: "BCT" },
  ],
  Friday: [
    { id: "fri-coi", courseName: "CoI", label: "CoI" },
    { id: "fri-communication", courseName: "Communication", label: "Communication" },
    { id: "fri-aiml", courseName: "AIML", label: "AIML" },
    { id: "fri-cd", courseName: "CD", label: "CD" },
  ],
};

function getTodayDayKey(): DayKey {
  const dayIndex = new Date().getDay(); // 0 = Sun, 1 = Mon, ...
  const map: Record<number, DayKey> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
  };

  return map[dayIndex] ?? "Monday";
}

function Home() {
  const [selectedDay, setSelectedDay] = useState<DayKey>(getTodayDayKey());
  const [statusByClassId, setStatusByClassId] = useState<Record<string, ClassStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  
  // Extra class state
  const [extraCourseName, setExtraCourseName] = useState<string>("");
  const [extraDate, setExtraDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isSubmittingExtra, setIsSubmittingExtra] = useState(false);
  
  // Secret word state
  const [secretWord, setSecretWord] = useState<string>("");

  const classesForDay = useMemo(() => ROUTINE[selectedDay] ?? [], [selectedDay]);

  const handleStatusChange = (classId: string, status: ClassStatus) => {
    setStatusByClassId((prev) => ({
      ...prev,
      [classId]: status,
    }));
  };

  const handleDayChange = (day: DayKey) => {
    setSelectedDay(day);
    // Clear statuses when switching day to avoid confusion
    setStatusByClassId({});
    setMessage(null);
    setMessageType(null);
  };

  const markAbsent = async (courseName: string, isoDate: string) => {
    if (!secretWord.trim()) {
      throw new Error("Secret word is required");
    }
    const url = `${API_BASE}/absent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseName,
        date: isoDate,
        secret: secretWord,
      }),
    });
    if (!res.ok && res.status !== 409) {
      // 409 means already marked; treat as non-fatal
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to mark absent");
    }
  };

  const markCancelled = async (courseName: string, isoDate: string) => {
    if (!secretWord.trim()) {
      throw new Error("Secret word is required");
    }
    const url = `${API_BASE}/cancel`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseName,
        date: isoDate,
        secret: secretWord,
      }),
    });
    if (!res.ok && res.status !== 409) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to mark cancelled");
    }
  };

  const updateAttendance = async (
    courseName: string,
    increments: { incrementAttended: number; incrementTotal: number }
  ) => {
    if (!secretWord.trim()) {
      throw new Error("Secret word is required");
    }
    const res = await fetch(`${API_BASE}/update`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseName,
        ...increments,
        secret: secretWord,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to update attendance");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMessage(null);
    setMessageType(null);

    const isoDate = new Date().toISOString().split("T")[0];
    const results: string[] = [];
    const errors: string[] = [];

    for (const routineClass of classesForDay) {
      const currentStatus = statusByClassId[routineClass.id] ?? "pending";

      if (currentStatus === "pending") continue;

      try {
        if (currentStatus === "attended") {
          await updateAttendance(routineClass.courseName, {
            incrementAttended: 1,
            incrementTotal: 1,
          });
          results.push(`${routineClass.label}: attended`);
        } else if (currentStatus === "absent") {
          await updateAttendance(routineClass.courseName, {
            incrementAttended: 0,
            incrementTotal: 1,
          });
          await markAbsent(routineClass.courseName, isoDate);
          results.push(`${routineClass.label}: absent`);
        } else if (currentStatus === "cancelled") {
          await markCancelled(routineClass.courseName, isoDate);
          results.push(`${routineClass.label}: cancelled`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${routineClass.label}: ${msg}`);
      }
    }

    if (errors.length === 0) {
      setMessageType("success");
      setMessage(
        results.length > 0
          ? "Attendance updated successfully for selected classes."
          : "No classes were marked; nothing to update."
      );
    } else {
      setMessageType("error");
      setMessage(
        `Some updates failed:\n${errors.join("\n")}`
      );
    }

    setIsSubmitting(false);
  };

  const handleExtraClass = async () => {
    if (!extraCourseName.trim()) {
      setMessageType("error");
      setMessage("Please select a course for the extra class.");
      return;
    }

    if (!secretWord.trim()) {
      setMessageType("error");
      setMessage("Please enter the secret word.");
      return;
    }

    setIsSubmittingExtra(true);
    setMessage(null);
    setMessageType(null);

    try {
      const url = `${API_BASE}/extra`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseName: extraCourseName,
          date: extraDate,
          secret: secretWord,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to add extra class");
      }

      await res.json();
      setMessageType("success");
      setMessage(`Extra class added successfully for ${extraCourseName} on ${extraDate}. Attendance has been updated.`);
      
      // Reset form
      setExtraCourseName("");
      setExtraDate(new Date().toISOString().split("T")[0]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessageType("error");
      setMessage(`Failed to add extra class: ${msg}`);
    } finally {
      setIsSubmittingExtra(false);
    }
  };

  // Get all unique course names from routine
  const allCourses = useMemo(() => {
    const courses = new Set<string>();
    Object.values(ROUTINE).forEach(dayClasses => {
      dayClasses.forEach(cls => courses.add(cls.courseName));
    });
    return Array.from(courses).sort();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Daily Routine & Attendance</h1>
          <Link to="/status" className="nav-link">View Status →</Link>
        </div>
      </header>

      <section className="secret-section">
        <div className="form-group">
          <label htmlFor="secret-word">Secret Word:</label>
          <input
            id="secret-word"
            type="password"
            value={secretWord}
            onChange={(e) => setSecretWord(e.target.value)}
            className="form-input"
            placeholder="Enter secret word"
          />
        </div>
      </section>

      <section className="day-selector">
        {(Object.keys(ROUTINE) as DayKey[]).map((day) => (
          <button
            key={day}
            type="button"
            className={`day-button ${day === selectedDay ? "active" : ""}`}
            onClick={() => handleDayChange(day)}
          >
            {day}
          </button>
        ))}
      </section>

      <section className="routine-section">
        <h2>{selectedDay} Classes</h2>
        {classesForDay.length === 0 ? (
          <p className="no-classes">No classes scheduled for this day.</p>
        ) : (
          <div className="routine-table">
            <div className="routine-header">
              <span>Class</span>
              <span>Status</span>
            </div>
            {classesForDay.map((routineClass) => {
              const status = statusByClassId[routineClass.id] ?? "pending";
              return (
                <div key={routineClass.id} className="routine-row">
                  <div className="class-info">
                    <span className="class-label">{routineClass.label}</span>
                  </div>
                  <div className="status-controls">
                    <label className="status-option">
                      <input
                        type="radio"
                        name={routineClass.id}
                        value="attended"
                        checked={status === "attended"}
                        onChange={() =>
                          handleStatusChange(routineClass.id, "attended")
                        }
                      />
                      Attended
                    </label>
                    <label className="status-option">
                      <input
                        type="radio"
                        name={routineClass.id}
                        value="absent"
                        checked={status === "absent"}
                        onChange={() =>
                          handleStatusChange(routineClass.id, "absent")
                        }
                      />
                      Absent
                    </label>
                    <label className="status-option">
                      <input
                        type="radio"
                        name={routineClass.id}
                        value="cancelled"
                        checked={status === "cancelled"}
                        onChange={() =>
                          handleStatusChange(routineClass.id, "cancelled")
                        }
                      />
                      Cancelled
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="actions">
        <button
          type="button"
          className="submit-button"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Attendance"}
        </button>
      </section>

      <section className="extra-class-section">
        <h2>Extra Class</h2>
        <p className="subtitle" style={{ marginBottom: "1rem" }}>
          Record an extra class that happened on a particular day. This will automatically update attendance.
        </p>
        <div className="extra-class-form">
          <div className="form-group">
            <label htmlFor="extra-course">Course:</label>
            <select
              id="extra-course"
              value={extraCourseName}
              onChange={(e) => setExtraCourseName(e.target.value)}
              className="form-select"
            >
              <option value="">Select a course</option>
              {allCourses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="extra-date">Date:</label>
            <input
              id="extra-date"
              type="date"
              value={extraDate}
              onChange={(e) => setExtraDate(e.target.value)}
              className="form-input"
            />
          </div>
          <button
            type="button"
            className="extra-class-button"
            onClick={handleExtraClass}
            disabled={isSubmittingExtra}
          >
            {isSubmittingExtra ? "Adding..." : "Add Extra Class"}
          </button>
        </div>
      </section>

      {message && (
        <section
          className={`message ${messageType === "error" ? "error" : "success"}`}
        >
          {message.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </section>
      )}
    </div>
  );
}

export default Home;
