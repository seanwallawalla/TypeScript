namespace ts.tscWatch.cacheResolutions {
    describe("unittests:: tsbuild:: cacheResolutions::", () => {
        verifyTscWithEdits({
            scenario: "cacheResolutions",
            subScenario: "caching resolutions in multi file scenario",
            fs: getFsWithNode16,
            commandLineArgs: ["-b", "/src/project", "--explainFiles"],
            edits: [
                noChangeWithExportsDiscrepancyRun,
                {
                    subScenario: "write file not resolved by import",
                    modifyFs: fs => fs.writeFileSync("/src/project/node_modules/pkg1/require.d.ts", getPkgImportContent("Require", 1)),
                    discrepancyExplanation: noChangeWithExportsDiscrepancyRun.discrepancyExplanation
                },
                {
                    subScenario: "write file not resolved by typeRef",
                    modifyFs: fs => fs.writeFileSync("/src/project/node_modules/pkg3/require.d.ts", getPkgTypeRefContent("Require", 3)),
                },
                {
                    subScenario: "modify randomFileForImport by adding import",
                    modifyFs: fs => prependText(fs, "/src/project/randomFileForImport.ts", `import type { ImportInterface0 } from "pkg0" assert { "resolution-mode": "import" };\n`),
                },
                {
                    subScenario: "modify randomFileForTypeRef by adding typeRef",
                    modifyFs: fs => prependText(fs, "/src/project/randomFileForTypeRef.ts", `/// <reference types="pkg2" resolution-mode="import"/>\n`),
                },
            ]
        });

        verifyTscWithEdits({
            scenario: "cacheResolutions",
            subScenario: "caching resolutions with bundle emit",
            fs: getFsWithOut,
            commandLineArgs: ["-b", "/src/project", "--explainFiles"],
            edits: [
                noChangeRun,
                {
                    subScenario: "write file not resolved by import",
                    modifyFs: fs => fs.writeFileSync("/src/project/pkg1.d.ts", getPkgImportContent("Require", 1)),
                },
                {
                    subScenario: "write file not resolved by typeRef",
                    modifyFs: fs => {
                        fs.mkdirpSync("/src/project/node_modules/pkg3");
                        fs.writeFileSync("/src/project/node_modules/pkg3/index.d.ts", getPkgTypeRefContent("Require", 3));
                    },
                },
                {
                    subScenario: "modify randomFileForImport by adding import",
                    modifyFs: fs => prependText(fs, "/src/project/randomFileForImport.ts", `import type { ImportInterface0 } from "pkg0";\n`),
                },
                {
                    subScenario: "modify randomFileForTypeRef by adding typeRef",
                    modifyFs: fs => prependText(fs, "/src/project/randomFileForTypeRef.ts", `/// <reference types="pkg2"/>\n`),
                },
            ]
        });

        verifyTscWithEdits({
            scenario: "cacheResolutions",
            subScenario: "caching resolutions in multi project scenario",
            fs: getFsWithMultipleProjects,
            commandLineArgs: ["-b", "/src/project", "--explainFiles", "--v"],
            edits: [
                {
                    subScenario: "modify aRandomFileForImport by adding import",
                    modifyFs: fs => prependText(fs, "/src/project/aRandomFileForImport.ts", `export type { ImportInterface0 } from "pkg0";\n`),
                },
                {
                    subScenario: "modify bRandomFileForImport by adding import",
                    modifyFs: fs => prependText(fs, "/src/project/bRandomFileForImport.ts", `export type { ImportInterface0 } from "pkg0";\n`),
                },
                {
                    subScenario: "modify cRandomFileForImport by adding import",
                    modifyFs: fs => prependText(fs, "/src/project/cRandomFileForImport.ts", `export type { ImportInterface0 } from "pkg0";\n`),
                },
                {
                    subScenario: "Project build on B",
                    modifyFs: noop,
                    commandLineArgs: ["-p", "/src/project/tsconfig.b.json", "--explainFiles"],
                    discrepancyExplanation: () => [
                        "During incremental build, build succeeds because everything was built",
                        "Clean build does not have project build from a so it errors and has extra errors and incorrect buildinfo",
                    ]
                },
                {
                    subScenario: "modify bRandomFileForImport2 by adding import and project build",
                    modifyFs: fs => prependText(fs, "/src/project/bRandomFileForImport2.ts", `export type { ImportInterface0 } from "pkg0";\n`),
                    commandLineArgs: ["-p", "/src/project/tsconfig.b.json", "--explainFiles"],
                    discrepancyExplanation: () => [
                        "During incremental build, build succeeds because everything was built",
                        "Clean build does not have project build from a so it errors and has extra errors and incorrect buildinfo",
                    ]
                },
                {
                    subScenario: "Project build on c",
                    modifyFs: noop,
                    commandLineArgs: ["-p", "/src/project", "--explainFiles"],
                    discrepancyExplanation: () => [
                        "During incremental build, build succeeds because everything was built",
                        "Clean build does not have project build from a and b so it errors and has extra errors and incorrect buildinfo",
                    ]
                },
                {
                    subScenario: "modify cRandomFileForImport2 by adding import and project build",
                    modifyFs: fs => prependText(fs, "/src/project/cRandomFileForImport2.ts", `export type { ImportInterface0 } from "pkg0";\n`),
                    commandLineArgs: ["-p", "/src/project", "--explainFiles"],
                    discrepancyExplanation: () => [
                        "During incremental build, build succeeds because everything was built",
                        "Clean build does not have project build from a and b so it errors and has extra errors and incorrect buildinfo",
                    ]
                },
            ]
        });
    });

    function getRandomFileContent() {
        return `export const x = 10;`;
    }
    function getPkgPackageJsonContent(pkg: number) {
        return JSON.stringify({
            name: `pkg${pkg}`,
            version: "0.0.1",
            exports: {
                import: "./import.js",
                require: "./require.js"
            }
        });
    }
    export function getPkgImportContent(type: "Import" | "Require", pkg: number) {
        return `export interface ${type}Interface${pkg} {}`;
    }
    export function getPkgTypeRefContent(type: "Import" | "Require", pkg: number) {
        return Utils.dedent`
            export {};
            declare global {
                interface ${type}Interface${pkg} {}
            }
        `;
    }
    function getFsMapWithNode16(): { [path: string]: string; } {
        return {
            "/src/project/tsconfig.json": JSON.stringify({
                compilerOptions: {
                    moduleResolution: "node16",
                    composite: true,
                    cacheResolutions: true,
                    traceResolution: true,
                },
                include: ["*.ts"],
                exclude: ["*.d.ts"]
            }),
            "/src/project/fileWithImports.ts": Utils.dedent`
                import type { ImportInterface0 } from "pkg0" assert { "resolution-mode": "import" };
                import type { RequireInterface1 } from "pkg1" assert { "resolution-mode": "require" };
            `,
            "/src/project/randomFileForImport.ts": getRandomFileContent(),
            "/src/project/node_modules/pkg0/package.json": getPkgPackageJsonContent(0),
            "/src/project/node_modules/pkg0/import.d.ts": getPkgImportContent("Import", 0),
            "/src/project/node_modules/pkg0/require.d.ts": getPkgImportContent("Require", 0),
            "/src/project/node_modules/pkg1/package.json": getPkgPackageJsonContent(1),
            "/src/project/node_modules/pkg1/import.d.ts": getPkgImportContent("Import", 1),
            "/src/project/fileWithTypeRefs.ts": Utils.dedent`
                /// <reference types="pkg2" resolution-mode="import"/>
                /// <reference types="pkg3" resolution-mode="require"/>
                interface LocalInterface extends ImportInterface2, RequireInterface3 {}
                export {}
            `,
            "/src/project/randomFileForTypeRef.ts": getRandomFileContent(),
            "/src/project/node_modules/pkg2/package.json": getPkgPackageJsonContent(2),
            "/src/project/node_modules/pkg2/import.d.ts": getPkgTypeRefContent("Import", 2),
            "/src/project/node_modules/pkg2/require.d.ts": getPkgTypeRefContent("Require", 2),
            "/src/project/node_modules/pkg3/package.json": getPkgPackageJsonContent(3),
            "/src/project/node_modules/pkg3/import.d.ts": getPkgTypeRefContent("Import", 3),
            "/src/project/node_modules/@types/pkg4/index.d.ts": getRandomFileContent(),
        };
    }

    export function getFsWithNode16() {
        return loadProjectFromFiles(getFsMapWithNode16());
    }

    export function getWatchSystemWithNode16() {
        const system = createWatchedSystem(getFsMapWithNode16(), { currentDirectory: "/src/project" });
        system.ensureFileOrFolder(libFile);
        return system;
    }

    export function getServerHostWithNode16() {
        const system = TestFSWithWatch.createServerHost(getFsMapWithNode16(), { currentDirectory: "/src/project" });
        system.writeFile(libFile.path, libFile.content);
        return system;
    }

    export function getWatchSystemWithNode16WithBuild() {
        const system = getWatchSystemWithNode16();
        solutionBuildWithBaseline(system, ["/src/project"]);
        return system;
    }

    export function getServerHostWithNode16WithBuild() {
        const system = getServerHostWithNode16();
        solutionBuildWithBaseline(system, ["/src/project"]);
        return system;
    }

    function getFsMapWithOut(): { [path: string]: string; } {
        return {
            "/src/project/tsconfig.json": JSON.stringify({
                compilerOptions: {
                    module: "amd",
                    composite: true,
                    cacheResolutions: true,
                    traceResolution: true,
                    out: "./out.js"
                },
                include: ["*.ts"],
                exclude: ["*.d.ts"]
            }),
            "/src/project/fileWithImports.ts": Utils.dedent`
                import type { ImportInterface0 } from "pkg0";
                import type { RequireInterface1 } from "pkg1";
            `,
            "/src/project/randomFileForImport.ts": getRandomFileContent(),
            "/src/project/pkg0.d.ts": getPkgImportContent("Import", 0),
            "/src/project/fileWithTypeRefs.ts": Utils.dedent`
                /// <reference types="pkg2"/>
                /// <reference types="pkg3"/>
                interface LocalInterface extends ImportInterface2, RequireInterface3 {}
                export {}
            `,
            "/src/project/randomFileForTypeRef.ts": getRandomFileContent(),
            "/src/project/node_modules/pkg2/index.d.ts": getPkgTypeRefContent("Import", 2),
            "/src/project/node_modules/@types/pkg4/index.d.ts": getRandomFileContent(),
        };
    }

    export function getFsWithOut() {
        return loadProjectFromFiles(getFsMapWithOut());
    }

    export function getWatchSystemWithOut() {
        const system = createWatchedSystem(getFsMapWithOut(), { currentDirectory: "/src/project" });
        system.ensureFileOrFolder(libFile);
        return system;
    }

    export function getServerHostWithOut() {
        const system = TestFSWithWatch.createServerHost(getFsMapWithOut(), { currentDirectory: "/src/project" });
        system.writeFile(libFile.path, libFile.content);
        return system;
    }

    export function getWatchSystemWithOutWithBuild() {
        const system = getWatchSystemWithOut();
        solutionBuildWithBaseline(system, ["/src/project"]);
        return system;
    }

    export function getServerHostWithOutWithBuild() {
        const system = getServerHostWithOut();
        solutionBuildWithBaseline(system, ["/src/project"]);
        return system;
    }

    function getFsMapWithMultipleProjects(): { [path: string]: string; } {
        return {
            "/src/project/tsconfig.a.json": JSON.stringify({
                compilerOptions: {
                    composite: true,
                    cacheResolutions: true,
                    traceResolution: true,
                },
                files: ["aFileWithImports.ts", "aRandomFileForImport.ts", "aRandomFileForImport2.ts"],
            }),
            "/src/project/aFileWithImports.ts": Utils.dedent`
                import type { ImportInterface0 } from "pkg0";
                export { x } from "./aRandomFileForImport";
                export { x as x2 } from "./aRandomFileForImport2";
                export const y = 10;
            `,
            "/src/project/aRandomFileForImport.ts": getRandomFileContent(),
            "/src/project/aRandomFileForImport2.ts": getRandomFileContent(),
            "/src/project/node_modules/pkg0/index.d.ts": getPkgImportContent("Import", 0),
            "/src/project/tsconfig.b.json": JSON.stringify({
                compilerOptions: {
                    composite: true,
                    cacheResolutions: true,
                    traceResolution: true,
                },
                files: ["bFileWithImports.ts", "bRandomFileForImport.ts", "bRandomFileForImport2.ts"],
                references: [{ path: "./tsconfig.a.json" }]
            }),
            "/src/project/bFileWithImports.ts": Utils.dedent`
                export { y } from "./aFileWithImports";
                export { x } from "./bRandomFileForImport";
                import type { ImportInterface0 } from "pkg0";
            `,
            "/src/project/bRandomFileForImport.ts": getRandomFileContent(),
            "/src/project/bRandomFileForImport2.ts": getRandomFileContent(),
            "/src/project/tsconfig.json": JSON.stringify({
                compilerOptions: {
                    composite: true,
                    cacheResolutions: true,
                    traceResolution: true,
                    module: "amd"
                },
                files: ["cFileWithImports.ts", "cRandomFileForImport.ts", "cRandomFileForImport2.ts"],
                references: [{ path: "./tsconfig.a.json" }, { path: "./tsconfig.b.json" }]
            }),
            "/src/project/cFileWithImports.ts": Utils.dedent`
                import { y } from "./bFileWithImports";
                import type { ImportInterface0 } from "pkg0";
            `,
            "/src/project/cRandomFileForImport.ts": getRandomFileContent(),
            "/src/project/cRandomFileForImport2.ts": getRandomFileContent(),
            "/src/project/pkg0.d.ts": getPkgImportContent("Import", 0),
        };
    }

    export function getFsWithMultipleProjects() {
        return loadProjectFromFiles(getFsMapWithMultipleProjects());
    }

    export function getWatchSystemWithMultipleProjects() {
        const system = createWatchedSystem(getFsMapWithMultipleProjects(), { currentDirectory: "/src/project" });
        system.ensureFileOrFolder(libFile);
        return system;
    }

    export function getServerHostWithMultipleProjects() {
        const system = TestFSWithWatch.createServerHost(getFsMapWithMultipleProjects(), { currentDirectory: "/src/project" });
        system.writeFile(libFile.path, libFile.content);
        return system;
    }

    export function getWatchSystemWithMultipleProjectsWithBuild() {
        const system = getWatchSystemWithMultipleProjects();
        solutionBuildWithBaseline(system, ["/src/project"]);
        return system;
    }

    export function getServerHostWithMultipleProjectsWithBuild() {
        const system = getServerHostWithMultipleProjects();
        solutionBuildWithBaseline(system, ["/src/project"]);
        return system;
    }
}