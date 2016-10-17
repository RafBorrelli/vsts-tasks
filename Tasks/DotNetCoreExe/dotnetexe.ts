import tl = require("vsts-task-lib/task");
import path = require("path");
import fs = require("fs");
var minimist = require('minimist');

export class dotNetExe {
    private command: string;
    private projects: string;
    private arguments: string;
    private publishWebProjects: boolean;
    private zipAfterPublish: boolean;
    private outputArgument: string;
    private remainingArgument: string;

    constructor() {
        this.command = tl.getInput("command");
        this.projects = tl.getInput("projects", false);
        this.arguments = tl.getInput("arguments", false);
        this.publishWebProjects = tl.getBoolInput("publishWebProjects", false);
        this.zipAfterPublish = tl.getBoolInput("zipAfterPublish", false);
    }

    public execute() {
        var dotnetPath = tl.which("dotnet", true);

        this.updateOutputArgument();

        var projectFiles: string[] = (this.command === "publish" && this.publishWebProjects)
            ? filePathHelper.getWebProjects("projects")
            : filePathHelper.getFilesWithMatchingPattern(this.projects, "projects");

        projectFiles.forEach((projectFile) => {
            try {
                var dotnet = tl.tool(dotnetPath);
                dotnet.arg(this.command);
                dotnet.arg(projectFile);
                dotnet.line(this.getCommandArguments(projectFile));

                var result = dotnet.execSync();
                if (result.code != 0) {
                    tl.setResult(result.code, "Command failed with non-zero exit code.");
                }

                this.zipAfterPublishIfRequired(projectFile);
            }
            catch (err)
            {
                tl.setResult(1, err.message);
            }
        });
    }

    private zipAfterPublishIfRequired(projectFile: string): void {
        if (this.command === "publish" && this.zipAfterPublish) {
            var outputSource: string = "";
            if (this.outputArgument) {
                outputSource = path.join(this.outputArgument, path.dirname(projectFile));
            }
            else {
                //TODO:: Fix this.
            }

            var outputTarget = outputSource + ".zip";
            if (tl.exist(outputSource)) {
                this.zip(outputSource, outputTarget);
            }
        }
    }

    private zip (source: string, target: string) {
        var win = tl.osType().match(/^Win/);
        // TODO:: Complete this.
        if (win) {
            var tool = tl.tool(tl.which("cscript.exe", true));
            tool.arg(source);
            tool.arg(target);
            tl.rmRF(source);
        }
    }

    private getCommandArguments(projectFile: string): string {
        if (this.command === "publish" && this.outputArgument) {
            var output = path.join(this.outputArgument, path.dirname(projectFile));
            return this.remainingArgument + ' --output ' + output;
        }

        return this.arguments;
    }

    private updateOutputArgument(): void {
        this.outputArgument = this.remainingArgument = "";
        if (this.command === "publish" && this.arguments) {
            // TODO:: Fix this.
            var options = minimist(this.arguments.split(" "));

            for (var option in options) {
                if (option === "o" || option === "output") {
                    this.outputArgument = options[option];
                }
                else if(option !== "_") {
                    this.remainingArgument += "--" + option + ' ' + options[option];
                }
            }
        }

    }
}

class filePathHelper {
    public static getWebProjects(argName: string): string [] {
        var allFiles = filePathHelper.getFilesWithMatchingPattern("**/project.json", argName);
        var webProjects = allFiles.filter(function(file, index, files): boolean {
            var directory = path.dirname(file);
            return fs.existsSync(path.join(directory, "web.config")) 
                || fs.existsSync(path.join(directory, "wwwroot"));
        });

        if (!webProjects.length) {
            tl.setResult(1, "No matching files were found for argument: " + argName);
        }

        return webProjects;
    }

    public static getFilesWithMatchingPattern(filePattern: string, argName: string): string[] {
        var filesList = [];
        if (filePattern.indexOf('*') == -1 && filePattern.indexOf('?') == -1) {
            tl.checkPath(filePattern, argName);
            filesList = [filePattern];
        }
        else {
            // Find app files matching the specified pattern
            tl.debug('Matching glob pattern: ' + filePattern);
            // First find the most complete path without any matching patterns
            var idx = filePathHelper.firstWildcardIndex(filePattern);
            tl.debug('Index of first wildcard: ' + idx);
            var findPathRoot = path.dirname(filePattern.slice(0, idx));
            tl.debug('find root dir: ' + findPathRoot);
            // Now we get a list of all files under this root
            var allFiles = tl.find(findPathRoot);
            // Now matching the pattern against all files
            filesList = tl.match(allFiles, filePattern, { matchBase: true });
            // Fail if no matching .csproj files were found
            if (!filesList || filesList.length == 0) {
                tl.setResult(1, 'No matching files were found with search pattern: ' + argName);
            }
        }

        return filesList;
    }

    private static firstWildcardIndex(str: string): number {
        var idx = str.indexOf('*');
        var idxOfWildcard = str.indexOf('?');
        if (idxOfWildcard > -1) {
            return (idx > -1) ? Math.min(idx, idxOfWildcard) : idxOfWildcard;
        }
        return idx;
    };
}

var exe = new dotNetExe();
exe.execute();