export async function exportBlueprintAsGist(blueprint, token) {
  const content = JSON.stringify(blueprint, null, 2);
  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
    },
    body: JSON.stringify({
      description: "Moodle Playground Blueprint",
      public: false,
      files: {
        "moodle-playground.blueprint.json": {
          content,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub API error: ${response.status} ${error.message || ""}`,
    );
  }

  const gist = await response.json();
  return {
    url: gist.html_url,
    rawUrl: gist.files["moodle-playground.blueprint.json"]?.raw_url,
    id: gist.id,
  };
}

export function buildGistPlaygroundUrl(rawUrl, baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("blueprint-url", rawUrl);
  return url.toString();
}
