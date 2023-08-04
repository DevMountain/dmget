#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import extract from "extract-zip";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import * as path from "node:path";
import process from "node:process";

import {
  BASE_URL,
  DEMO_URL,
  DESCRIPTION,
  DESTINATION,
  EXERCISE_URL,
  HOMEWORK_URL,
  NAME,
} from "./src/constants.mjs";
import {
  afterSuccess,
  helpTldr,
  programRunning,
  tldr,
} from "./src/logMessages.mjs";

const cmd = new Command();

let tempfile;

const logTask = (msg, opts = {}) => {
  const { prefix, prefixChalk } = opts;
  const chalk_ = prefixChalk ?? chalk.bgBlue;
  console.log(chalk.bold(`${chalk_.black(prefix ?? " * ")} ${msg}`));
};

const logSubtask = (msg) => {
  console.log(chalk.blue(msg));
};

const cleanup = () => {
  if (tempfile) {
    logTask(chalk.black("Cleaning up temporary files..."), {
      prefix: " - ",
      prefixChalk: chalk.bgBlack,
    });
    unlinkSync(tempfile);
    console.log(chalk.black(`Removed ${tempfile}`));
  }
};

const downloadFile = async (fileUrl) => {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        `No file exists at ${fileUrl} -- are you sure you spelled everything correctly?`
      );
    } else {
      throw new Error(
        `Failed to download ${fileUrl} with status: ${res.statusText} ${res.status}`
      );
    }
  }
  return res;
};

const writeDownloadedFile = async (response, dest) => {
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(dest, buffer);
};

const extractZip = async (zipFile, destination) => {
  await extract(zipFile, {
    dir: destination,
    onEntry: (entry) => {
      const { fileName } = entry;
      const pathParts = path.parse(fileName);
      const dest = path.join(destination, fileName);

      if (!pathParts.dir && existsSync(dest)) {
        throw new Error(`\
Can't extract files because ${abbreviateHome(destination)} already exists.

If you really want to overwrite it, delete ${abbreviateHome(
          destination
        )} and try again.
            `);
      }
    },
  });
};

const abbreviateHome = (p) => p.replace(homedir(), "~");
const formatPath = (p) => {
  const filepath = path.normalize(p);
  // Check if this is a win32-formatted path; if it is, replace '\\' with '\\\\'.
  // '\' is an escape character so it disappears whenever we print it to the terminal.
  // For example, 'c:\\blah\\blah' will look like:
  //   c:\blah\blah
  //
  // You might be thinking, "Since most of our students use Git BASH, why not just
  // use path.posix.normalize and be done with it?" *Most* is the operative term here.
  // Plus, it's safer Node decide which path separator to use than implement OS support
  // ourselves.
  //
  // That said, using replace() is definitely a hack and is super brittle but I couldn't figure
  // out a better way to do this.
  return filepath.includes("\\") ? filepath.replace(/\\/g, "\\\\") : filepath;
};

const main = async () => {
  cmd
    .name(NAME)
    .description(DESCRIPTION)
    .argument("<slug>", "unique identifier of the exercise to download")
    .option("-u, --url <url>", "base URL of exercises", BASE_URL)
    .option("-p, --path <destination>", "path to extract files", DESTINATION)
    .option("--solution", "download the solution instead of the starter code")
    .option(
      "--homework",
      "download a homework assignment instead of an exercise"
    )
    .option("--demo", "download a lecture demo instead of an exercise")
    .configureOutput({
      writeErr: (str) => {
        process.stdout.write(`${chalk.red("Error:")} ${str}`);
      },
      outputError: (str, write) => write(str),
    })
    .exitOverride((err) => {
      if (err.message.includes("missing required argument")) {
        logTask("Need help?", { prefix: " 💡 ", prefixChalk: chalk.bgBlack });
        console.log(helpTldr);
      }

      cleanup();
    })
    .action(async (slug, opts) => {
      console.log(programRunning);

      if (slug === "tldr") {
        console.log(tldr);
      } else {
        await run(cmd, slug, opts);
      }
    });

  cmd.parse(process.argv);
};

const run = async (cmd, slug, opts) => {
  // Guard against passing --solution and --demo at the same time
  if (opts.demo && opts.solution) {
    cmd.error(
      `--solution and --demo can't be both passed as options because lecture demos don't have solutions.`
    );
  }

  logTask(
    `Setting up ${opts.demo ? "demo" : "starter"} code for ${chalk.green(slug)}`
  );

  const url = opts.demo
    ? DEMO_URL
    : opts.homework
    ? HOMEWORK_URL
    : EXERCISE_URL;
  const filename = opts.solution ? `${slug}-solution.zip` : `${slug}.zip`;
  const fileUrl = `${url}/${filename}`;

  // Attempt to download zip file
  try {
    const response = await downloadFile(fileUrl);
    logSubtask(`Downloading ${fileUrl}`);

    // Save zip file to temporary location
    tempfile = path.join(tmpdir(), filename);
    await writeDownloadedFile(response, tempfile);
    logSubtask(`Temporarily saved file to ${tempfile}`);

    // Extract zip file to destination
    const destination = path.join(
      opts.path,
      opts.demo ? "demos" : opts.homework ? "homework" : "",
      opts.solution ? `${slug}-solution` : slug
    );
    await extractZip(tempfile, destination);

    logSubtask(
      `Extracting files to ${formatPath(abbreviateHome(destination))}`
    );

    console.log(chalk.bold(`${chalk.bgGreen(" ✔ ")} Success!\n`));
    console.log(afterSuccess(`${formatPath(abbreviateHome(destination))}`));
  } catch (err) {
    cmd.error(err.message);
  }

  cleanup();
};

main();
