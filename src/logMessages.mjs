import chalk from "chalk";
import gradient from "gradient-string";

import { NAME } from "./constants.mjs";

export const programRunning = chalk.bold(
  gradient.pastel(`██████ Running ${NAME}...\n`)
);

export const helpTldr = chalk.green(
  `\
To see examples of how to use ${chalk.blue("dmget")}, run:

      ${chalk.cyan("dmget tldr")}

Or, get more detailed help with:

      ${chalk.cyan("dmget --help")}
  `
);

export const tldr = chalk.green(
  `\
Download the starter code for a lab exercise:

      ${chalk.cyan("dmget making-decisions")}

Download the solution code for a lab exercise:

      ${chalk.cyan("dmget making-decisions --solution")}

Download the starter code for a homework assignment:

      ${chalk.cyan("dmget coding-intro --homework")}

Download the demo code for a lecture:

      ${chalk.cyan("dmget coding-intro --demo")}
  `
);

export const afterSuccess = (projDir) =>
  chalk.green(
    `\
To cd into the project directory and open it in VS Code, run:

      ${chalk.cyan("cd " + projDir)}
      ${chalk.cyan("code .")}

Download the solution by running the same command with the --solution flag (run ${chalk.cyan(
      "dmget tldr"
    )} for examples).
  `
  );
