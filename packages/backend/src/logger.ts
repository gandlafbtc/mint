import { ansiColorFormatter, configure, getConsoleSink, getFileSink, getLogger } from "@logtape/logtape";

await configure({
    sinks: { console: getConsoleSink({formatter: ansiColorFormatter}),
        file: getFileSink("app.log"),
    },
    loggers: [
        { category: "mnt-app", lowestLevel: "debug", sinks: ["console", "file"] },
    ],
});

export const log = getLogger(["mnt-app"]);