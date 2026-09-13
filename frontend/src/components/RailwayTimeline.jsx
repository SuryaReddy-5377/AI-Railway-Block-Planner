import { useMemo } from "react";

function RailwayTimeline({ plan }) {

  /*
   * The AI planner may return:
   *
   * {
   *   planned_tasks: 8,
   *   unplanned_tasks: 2,
   *   plan: [...]
   * }
   *
   * OR simply an array.
   *
   * Normalize both formats here.
   */
  const planItems = useMemo(() => {
    if (Array.isArray(plan)) {
      return plan;
    }

    if (Array.isArray(plan?.plan)) {
      return plan.plan;
    }

    return [];
  }, [plan]);


  /*
   * Convert HH:MM into minutes from midnight.
   */
  const timeToMinutes = (time) => {

    if (!time) {
      return 0;
    }

    const value = String(time).trim();

    const match = value.match(
      /(\d{1,2}):(\d{2})/
    );

    if (!match) {
      return 0;
    }

    return (
      Number(match[1]) * 60 +
      Number(match[2])
    );
  };


  /*
   * Format time for display.
   */
  const formatTime = (time) => {

    if (!time) {
      return "—";
    }

    const value = String(time).trim();

    const match = value.match(
      /(\d{1,2}):(\d{2})/
    );

    if (!match) {
      return value;
    }

    return `${match[1].padStart(2, "0")}:${match[2]}`;
  };


  /*
   * Calculate end time when only start time
   * and duration are available.
   */
  const getEndTime = (start, duration) => {

    const startMinutes =
      timeToMinutes(start);

    const durationMinutes =
      Number(duration || 0) * 60;

    const endMinutes =
      startMinutes + durationMinutes;

    const hours =
      Math.floor(endMinutes / 60) % 24;

    const minutes =
      Math.round(endMinutes % 60);

    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(2, "0")}`;
  };


  /*
   * Create a timeline only from the AI-generated plan.
   *
   * This avoids the /blocks 404 problem completely.
   */
  const timelineItems = useMemo(() => {

    return planItems
      .filter(
        (item) =>
          item &&
          item.status === "PLANNED" &&
          item.recommended_block
      )
      .map((item, index) => {

        const start =
          item.block_start;

        const end =
          item.block_end ||
          getEndTime(
            item.block_start,
            item.duration_hours
          );

        return {
          ...item,
          start,
          end,
          startMinutes:
            timeToMinutes(start),
          endMinutes:
            timeToMinutes(end),
          index,
        };
      });

  }, [planItems]);


  /*
   * Nothing generated yet.
   */
  if (!plan) {

    return (
      <section className="timeline-section">

        <div className="timeline-header">

          <div>
            <h2>
              🛤️ Railway Block Timeline
            </h2>

            <p>
              Generate an optimal plan to display
              AI-selected maintenance windows.
            </p>
          </div>

        </div>

        <div className="timeline-empty">

          <div>
            🤖
          </div>

          <strong>
            AI Timeline Waiting
          </strong>

          <p>
            Click "Generate Optimal Plan" above
            to visualize the recommended maintenance
            blocks.
          </p>

        </div>

      </section>
    );
  }


  /*
   * If the planner returned no usable planned tasks.
   */
  if (timelineItems.length === 0) {

    return (
      <section className="timeline-section">

        <div className="timeline-header">

          <div>
            <h2>
              🛤️ Railway Block Timeline
            </h2>

            <p>
              AI-generated railway maintenance schedule.
            </p>
          </div>

        </div>

        <div className="timeline-empty">

          <div>
            ⚠️
          </div>

          <strong>
            No Tasks Could Be Scheduled
          </strong>

          <p>
            The AI planner did not find a feasible
            maintenance block for the current tasks.
          </p>

        </div>

      </section>
    );
  }


  /*
   * Determine timeline range from the AI plan.
   */
  const allTimes = timelineItems.flatMap(
    (item) => [
      item.startMinutes,
      item.endMinutes,
    ]
  );


  const minTime =
    Math.min(...allTimes);

  const maxTime =
    Math.max(...allTimes);


  const timelineStart =
    Math.floor(minTime / 60) * 60;


  const timelineEnd =
    Math.ceil(maxTime / 60) * 60 ||
    timelineStart + 60;


  const totalMinutes =
    Math.max(
      timelineEnd - timelineStart,
      60
    );


  /*
   * Convert a time range into a visual position.
   */
  const getPosition = (
    start,
    end
  ) => {

    const startMinutes =
      Math.max(
        timeToMinutes(start),
        timelineStart
      );

    const endMinutes =
      Math.min(
        timeToMinutes(end),
        timelineEnd
      );


    const left =
      ((startMinutes - timelineStart) /
        totalMinutes) *
      100;


    const width =
      ((endMinutes - startMinutes) /
        totalMinutes) *
      100;


    return {
      left: `${Math.max(
        0,
        left
      )}%`,

      width: `${Math.max(
        3,
        width
      )}%`,
    };
  };


  /*
   * Generate hourly labels.
   *
   * Use the complete label including the hour index
   * as the React key to avoid duplicate "00:00" keys.
   */
  const timeLabels = [];

  let labelIndex = 0;

  for (
    let time = timelineStart;
    time <= timelineEnd;
    time += 60
  ) {

    const hours =
      Math.floor(time / 60) % 24;

    timeLabels.push({
      id: labelIndex++,
      value: `${String(
        hours
      ).padStart(2, "0")}:00`,
    });
  }


  /*
   * Planned/unplanned counts.
   */
  const plannedCount =
    plan?.planned_tasks ??
    planItems.filter(
      (item) =>
        item.status === "PLANNED"
    ).length;


  const unplannedCount =
    plan?.unplanned_tasks ??
    planItems.filter(
      (item) =>
        item.status !== "PLANNED"
    ).length;


  return (
    <section className="timeline-section">

      {/* HEADER */}
      <div className="timeline-header">

        <div>

          <h2>
            🛤️ AI Railway Maintenance Timeline
          </h2>

          <p>
            Visual representation of the maintenance
            windows selected by the AI planner.
          </p>

        </div>

      </div>


      {/* LEGEND */}
      <div className="timeline-legend">

        <div>

          <span className="legend-box selected-legend"></span>

          AI Selected Maintenance

        </div>

      </div>


      {/* TIMELINE */}
      <div className="timeline-wrapper">

        {/* TIME HEADER */}
        <div className="timeline-time-header">

          <div className="timeline-label-space">
            Time
          </div>

          <div className="time-scale">

            {timeLabels.map((time) => (

              <span key={time.id}>
                {time.value}
              </span>

            ))}

          </div>

        </div>


        {/* AI PLAN ROW */}
        <div className="timeline-row">

          <div className="timeline-label">

            <strong>
              🤖 AI Plan
            </strong>

            <span>
              {plannedCount} tasks scheduled
            </span>

          </div>


          <div className="timeline-track">

            {timelineItems.map(
              (item, index) => {

                const position =
                  getPosition(
                    item.start,
                    item.end
                  );


                return (
                  <div
                    key={
                      item.task_id ||
                      `ai-task-${index}`
                    }

                    className="timeline-item ai-plan-item"

                    style={position}

                    title={
                      `${item.task_id} → ` +
                      `${item.recommended_block} | ` +
                      `${formatTime(
                        item.start
                      )} → ` +
                      `${formatTime(
                        item.end
                      )}`
                    }
                  >

                    <strong>
                      {item.task_id}
                    </strong>

                    <span>
                      {item.recommended_block}
                    </span>

                  </div>
                );

              }
            )}

          </div>

        </div>


        {/* INDIVIDUAL TASK ROWS */}
        {timelineItems.map(
          (item, index) => {

            const position =
              getPosition(
                item.start,
                item.end
              );


            return (
              <div
                className="timeline-row"
                key={
                  `task-row-${
                    item.task_id ||
                    index
                  }`
                }
              >

                <div className="timeline-label">

                  <strong>
                    {item.task_id}
                  </strong>

                  <span>
                    {item.section}
                  </span>

                </div>


                <div className="timeline-track">

                  <div
                    className="timeline-item ai-plan-item"
                    style={position}
                    title={
                      `${item.task_id} | ` +
                      `${item.recommended_block} | ` +
                      `${formatTime(
                        item.start
                      )} → ` +
                      `${formatTime(
                        item.end
                      )}`
                    }
                  >

                    <strong>
                      {item.recommended_block}
                    </strong>

                    <span>
                      {formatTime(
                        item.start
                      )}{" → "}
                      {formatTime(
                        item.end
                      )}
                    </span>

                  </div>

                </div>

              </div>
            );

          }
        )}

      </div>


      {/* SUMMARY */}
      <div className="timeline-summary">

        <div>

          <strong>
            {plannedCount}
          </strong>

          <span>
            Tasks Planned
          </span>

        </div>


        <div>

          <strong>
            {unplannedCount}
          </strong>

          <span>
            Tasks Unplanned
          </span>

        </div>


        <div>

          <strong>
            {timelineItems.length}
          </strong>

          <span>
            AI Maintenance Windows
          </span>

        </div>

      </div>


      {/* AI EXPLANATION */}
      <div className="timeline-ai-message">

        🤖{" "}

        <strong>
          AI Planning Result:
        </strong>{" "}

        The system analyzed the maintenance tasks
        and selected feasible railway blocks based on
        section compatibility, duration, availability,
        block type and train-conflict constraints.

      </div>

    </section>
  );
}

export default RailwayTimeline;