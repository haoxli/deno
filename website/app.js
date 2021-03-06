// Copyright 2018 the Deno authors. All rights reserved. MIT license.

export async function getJson(path) {
  return (await fetch(path)).json();
}

export function getTravisData() {
  const url =
    "https://api.travis-ci.com/repos/denoland/deno/builds?event_type=pull_request";
  return fetch(url, {
    headers: {
      Accept: "application/vnd.travis-ci.2.1+json"
    }
  })
    .then(res => res.json())
    .then(data => data.builds.reverse());
}

export function createExecTimeColumns(data) {
  const benchmarkNames = Object.keys(data[data.length - 1].benchmark);
  return benchmarkNames.map(name => [
    name,
    ...data.map(d => {
      const benchmark = d.benchmark[name];
      const meanValue = benchmark ? benchmark.mean : 0;
      return meanValue || null;
    })
  ]);
}

export function createBinarySizeColumns(data) {
  const propName = "binary_size";
  const binarySizeNames = Object.keys(data[data.length - 1][propName]);
  return binarySizeNames.map(name => [
    name,
    ...data.map(d => {
      const binarySizeData = d["binary_size"];
      switch (typeof binarySizeData) {
        case "number": // legacy implementation
          return name === "deno" ? binarySizeData : 0;
        default:
          if (!binarySizeData) {
            return null;
          }
          return binarySizeData[name] || null;
      }
    })
  ]);
}

export function createThreadCountColumns(data) {
  const propName = "thread_count";
  const threadCountNames = Object.keys(data[data.length - 1][propName]);
  return threadCountNames.map(name => [
    name,
    ...data.map(d => {
      const threadCountData = d[propName];
      if (!threadCountData) {
        return null;
      }
      return threadCountData[name] || null;
    })
  ]);
}

export function createSyscallCountColumns(data) {
  const propName = "syscall_count";
  const syscallCountNames = Object.keys(data[data.length - 1][propName]);
  return syscallCountNames.map(name => [
    name,
    ...data.map(d => {
      const syscallCountData = d[propName];
      if (!syscallCountData) {
        return null;
      }
      return syscallCountData[name] || null;
    })
  ]);
}

function createTravisCompileTimeColumns(data) {
  return [["duration_time", ...data.map(d => d.duration)]];
}

export function createSha1List(data) {
  return data.map(d => d.sha1);
}

// Formats the byte sizes e.g. 19000 -> 18.55 KB
// Copied from https://stackoverflow.com/a/18650828
export function formatBytes(a, b) {
  if (0 == a) return "0 Bytes";
  var c = 1024,
    d = b || 2,
    e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
    f = Math.floor(Math.log(a) / Math.log(c));
  return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f];
}

export function formatSeconds(t) {
  const a = t % 60;
  const min = Math.floor(t / 60);
  return a < 30 ? `${min} min` : `${min + 1} min`;
}

export async function main() {
  const data = await getJson("./data.json");
  const travisData = (await getTravisData()).filter(d => d.duration > 0);

  const execTimeColumns = createExecTimeColumns(data);
  const binarySizeColumns = createBinarySizeColumns(data);
  const threadCountColumns = createThreadCountColumns(data);
  const syscallCountColumns = createSyscallCountColumns(data);
  const travisCompileTimeColumns = createTravisCompileTimeColumns(travisData);
  const sha1List = createSha1List(data);
  const sha1ShortList = sha1List.map(sha1 => sha1.substring(0, 6));
  const prNumberList = travisData.map(d => d.pull_request_number);

  const viewCommitOnClick = _sha1List => d => {
    window.open(
      `https://github.com/denoland/deno/commit/${_sha1List[d["index"]]}`
    );
  };

  const viewPullRequestOnClick = _prNumberList => d => {
    window.open(
      `https://github.com/denoland/deno/pull/${_prNumberList[d["index"]]}`
    );
  };

  c3.generate({
    bindto: "#exec-time-chart",
    data: {
      columns: execTimeColumns,
      onclick: viewCommitOnClick(sha1List)
    },
    axis: {
      x: {
        type: "category",
        show: false,
        categories: sha1List
      },
      y: {
        label: "seconds"
      }
    }
  });

  c3.generate({
    bindto: "#binary-size-chart",
    data: {
      columns: binarySizeColumns,
      onclick: viewCommitOnClick(sha1List)
    },
    axis: {
      x: {
        type: "category",
        show: false,
        categories: sha1ShortList
      },
      y: {
        tick: {
          format: d => formatBytes(d)
        }
      }
    }
  });

  c3.generate({
    bindto: "#thread-count-chart",
    data: {
      columns: threadCountColumns,
      onclick: viewCommitOnClick(sha1List)
    },
    axis: {
      x: {
        type: "category",
        show: false,
        categories: sha1ShortList
      }
    }
  });

  c3.generate({
    bindto: "#syscall-count-chart",
    data: {
      columns: syscallCountColumns,
      onclick: viewCommitOnClick(sha1List)
    },
    axis: {
      x: {
        type: "category",
        show: false,
        categories: sha1ShortList
      }
    }
  });

  c3.generate({
    bindto: "#travis-compile-time-chart",
    data: {
      columns: travisCompileTimeColumns,
      onclick: viewPullRequestOnClick(prNumberList)
    },
    axis: {
      x: {
        type: "category",
        categories: prNumberList
      },
      y: {
        tick: {
          format: d => formatSeconds(d)
        }
      }
    }
  });
}
