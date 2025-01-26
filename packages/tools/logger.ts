import { ansiColorFormatter, configure, getConsoleSink, getLogger, getRotatingFileSink } from "@logtape/logtape";

await configure({
    sinks: { console: getConsoleSink({formatter: ansiColorFormatter}),
    file: getRotatingFileSink("app.log", {
        maxSize: 0x400 * 0x400 * 5,
        maxFiles: 5
    }),
    },
    loggers: [
        { category: "mnt-tools", lowestLevel: "debug", sinks: ["console", "file"] },
    ],
});

export const log = getLogger(["mnt-tools"]);