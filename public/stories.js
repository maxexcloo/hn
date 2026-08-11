const bootstrapData = JSON.parse(
  document.getElementById("bootstrap-data").textContent,
);

const createElement = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
};

const filterStories = (stories, filter) => {
  const byScore = [...stories].sort(
    (first, second) => second.score - first.score,
  );
  const limit = {
    "top-10": 10,
    "top-20": 20,
    "top-50": Math.ceil(stories.length * 0.5),
  }[filter];

  return (limit ? byScore.slice(0, limit) : [...stories]).sort(
    (first, second) => second.time - first.time,
  );
};

const getFilterFromHash = () => {
  const filter = window.location.hash.slice(1);
  return ["all", "top-10", "top-20", "top-50"].includes(filter)
    ? filter
    : bootstrapData.currentFilter;
};

const getStoryUrl = (value) => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
};

const groupByDay = (stories) => {
  const groups = new Map();
  stories.forEach((story) => {
    const date = new Date(story.time * 1000);
    const key = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");

    if (!groups.has(key)) {
      groups.set(key, {
        label: date.toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
          weekday: "short",
          year: "numeric",
        }),
        stories: [],
      });
    }
    groups.get(key).stories.push(story);
  });
  return groups;
};

const renderStory = (story, index) => {
  const item = createElement("li", "mb-2 flex items-start");
  item.append(
    createElement(
      "span",
      "text-gray-500 text-xs mr-2 min-w-[20px] text-right",
      `${index + 1}.`,
    ),
  );

  const content = createElement("div", "flex-1");
  const storyUrl = getStoryUrl(story.url);
  const title = createElement(
    "a",
    "text-black dark:text-gray-200 no-underline text-sm visited:text-gray-500 dark:visited:text-gray-400",
    story.title,
  );
  title.href = storyUrl ? storyUrl.href : `/comments/${story.id}`;
  if (storyUrl) {
    title.rel = "nofollow noreferrer";
  }
  content.append(title);

  if (storyUrl) {
    content.append(
      createElement(
        "span",
        "text-gray-500 text-xs ml-1",
        `(${storyUrl.hostname})`,
      ),
    );
  }

  const metadata = createElement(
    "div",
    "text-gray-500 text-xs mt-0.5",
    `${story.score} points by ${story.by} | `,
  );
  const comments = createElement(
    "a",
    "text-gray-500 no-underline hover:underline",
    `${story.descendants || 0} comments`,
  );
  comments.href = `/comments/${story.id}`;
  metadata.append(comments);
  content.append(metadata);
  item.append(content);
  return item;
};

const updateFilterButtons = (activeFilter) => {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    const active = button.dataset.filter === activeFilter;
    button.setAttribute("aria-pressed", String(active));
    button.className = `filter-btn mr-2 px-2 py-1 rounded no-underline ${
      active
        ? "bg-gray-600 text-white"
        : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
    }`;
  });
};

const applyFilter = (filter) => {
  const container = document.getElementById("stories-container");
  const groups = groupByDay(bootstrapData.stories);
  container.replaceChildren();

  [...groups.keys()]
    .sort()
    .reverse()
    .forEach((key) => {
      const group = groups.get(key);
      const stories = filterStories(group.stories, filter);
      const section = createElement("section", "mb-8");
      section.append(
        createElement(
          "h2",
          "text-sm font-bold mb-3 text-gray-600 dark:text-gray-400",
          group.label,
        ),
      );

      const list = createElement("ol", "list-none pl-0");
      stories.forEach((story, index) => list.append(renderStory(story, index)));
      section.append(list);
      container.append(section);
    });

  if (groups.size === 0) {
    container.append(
      createElement(
        "p",
        "italic text-gray-500 text-xs",
        "No recent stories found.",
      ),
    );
  }

  updateFilterButtons(filter);
};

document.getElementById("filters").addEventListener("click", (event) => {
  const filter = event.target.dataset.filter;
  if (!filter) {
    return;
  }

  if (window.location.hash === `#${filter}`) {
    applyFilter(filter);
  } else {
    window.location.hash = filter;
  }
});

window.addEventListener("hashchange", () => applyFilter(getFilterFromHash()));
applyFilter(getFilterFromHash());
