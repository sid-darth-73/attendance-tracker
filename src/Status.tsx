import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

const API_BASE = "https://attendance-api-vk9k.onrender.com";

interface AttendanceData {
  courseName: string;
  attended: number;
  total: number;
  _id?: string;
  createdAt?: string;
}

function Status() {
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch attendance data");
      }

      const data = await res.json();
      setAttendanceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentage = (attended: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((attended / total) * 100);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="status-header">
          <h1>Attendance Status</h1>
          <Link to="/" className="nav-link">← Back to Home</Link>
        </div>
        <p className="loading-text">Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="status-header">
          <h1>Attendance Status</h1>
          <Link to="/" className="nav-link">← Back to Home</Link>
        </div>
        <div className="message error">
          <p>Error: {error}</p>
          <button onClick={fetchAttendance} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="status-header">
        <h1>Attendance Status</h1>
        <Link to="/" className="nav-link">← Back to Home</Link>
      </div>

      {attendanceData.length === 0 ? (
        <p className="no-classes">No attendance data available.</p>
      ) : (
        <div className="status-table">
          <div className="status-table-header">
            <span>Course</span>
            <span>Attended</span>
            <span>Total</span>
            <span>Percentage</span>
          </div>
          {attendanceData.map((course) => {
            const percentage = calculatePercentage(course.attended, course.total);
            const isLowAttendance = percentage < 75;
            
            return (
              <div
                key={course._id || course.courseName}
                className={`status-table-row ${isLowAttendance ? "low-attendance" : ""}`}
              >
                <span className="course-name">{course.courseName}</span>
                <span>{course.attended}</span>
                <span>{course.total}</span>
                <span className={`percentage ${isLowAttendance ? "low-percentage" : ""}`}>
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Status;
