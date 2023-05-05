#!/usr/bin/env node
import { homedir, tmpdir } from "node:os";
import { join, parse as parsePath } from "node:path";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { Command } from "commander";
import chalk from "chalk";
import gradient from "gradient-string";
import extract from "extract-zip";

const cmd = new Command();

const NAME = "dmget";
const DESCRIPTION =
  "A CLI helper to download Devmountain exercises, homework, and lecture demos.";
const BASE_URL = "https://ed.devmountain.com/materials";
const EXERCISE_URL = `${BASE_URL}/exercises`;
const HOMEWORK_URL = `${BASE_URL}/homework`;
const DEMO_URL = `${BASE_URL}/lectures`;
const DESTINATION = join(homedir(), "src");

let tempfile;
let projDir;

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
      if (err.code === "commander.error") {
        logTask("Cleaning up temporary files...");
        unlinkSync(tempfile);
        console.log(chalk.blue(`Removed ${tempfile}`));
      }
    })
    .action(async (slug, opts) => {
      console.log(chalk.bold(gradient.pastel(`===> Running ${NAME}...`)));
      await run(cmd, slug, opts);
    });
  cmd.parseAsync();
};

const logTask = (msg) => {
  console.log(chalk.bold(`${chalk.bgBlue(" * ")} ${msg}`));
};

const abbreviateHome = (path) => path.replace(homedir(), "~");

const run = async (cmd, slug, opts) => {
  let url = EXERCISE_URL;
  if (opts.homework) {
    url = HOMEWORK_URL;
  } else if (opts.demo) {
    url = DEMO_URL;
  }

  // Guard against passing --solution and --demo at the same time
  if (opts.demo && opts.solution) {
    cmd.error(
      `--solution and --demo can't be both passed as options because lecture demos don't have solutions.`
    );
  }

  logTask(
    `Setting up ${opts.demo ? "demo" : "starter"} code for ${chalk.green(slug)}`
  );

  const filename = opts.solution ? `${slug}-solution.zip` : `${slug}.zip`;
  const fileUrl = `${url}/${filename}`;

  // Attempt to download zip file
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found.
Are you sure you spelled '${slug}' correctly?
`);
      } else {
        throw new Error(
          `Failed to download ${fileUrl} with status [${response.statusText} ${response.status}]`
        );
      }
    }

    console.log(chalk.blue(`Downloading ${fileUrl}`));

    // Save zip file to temporary location
    const buffer = Buffer.from(await response.arrayBuffer());
    tempfile = join(tmpdir(), filename);
    writeFileSync(tempfile, buffer);
    console.log(chalk.blue(`Temporarily saved file to ${tempfile}`));

    // Extract zip file to destination
    const destination = join(opts.path, opts.homework ? "homework" : "");
    console.log(
      chalk.blue(`Extracting files to ${abbreviateHome(destination)}`)
    );
    await extract(tempfile, {
      dir: destination,
      onEntry: (entry) => {
        const pathParts = parsePath(entry.fileName);
        const dest = join(destination, entry.fileName);
        if (!pathParts.dir) {
          projDir = join(destination, pathParts.name);
          if (existsSync(dest)) {
            throw new Error(`Can't extract files because ${
              entry.fileName
            } already exists in ${abbreviateHome(destination)}.
  If you really want to overwrite it, delete ${abbreviateHome(
    dest
  )} and try again.
            `);
          }
        }
      },
    });
  } catch (err) {
    cmd.error(err.message);
  }

  console.log(chalk.bold(`${chalk.bgGreen(" ✔ ")} Success!`));
  console.log(`${chalk.yellow(
    "•"
  )} To cd into the project directory and open it in VS Code, run:

      cd ${abbreviateHome(projDir)}
      code .
`);
  console.log(
    `${chalk.yellow(
      "•"
    )} Download the solution by running the same command with the --solution flag:

      ${NAME} ${slug} ${opts.homework ? "--homework" : ""} --solution
`
  );
};

main();
