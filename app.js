// Small Helpers
const $ = _ => document.querySelector(_)
const $$ = _ => document.querySelectorAll(_)
const pp = _ => console.info(_)

const manipulate = {
    allCommitsInBranch(branch = "master") {
        return gitgraph._graph.commits.filter(commit => commit.branches.includes(branch))
    },

    childrenOfBranch(branch_name = "master") {
        // const branchName = branch.gg.name;
        const children = []
        for (const branch of scratch.branches) {
            const bb = scratch[branch]
            if (bb.parent == branch_name) {
                children.push(branch)
            }
        }
        return children;
    }
}

// Init State & Links
const gitgraph = GitgraphJS.createGitgraph($("#git-graph"), {
    author: "You <you@you.mail>",
    orientation: "vertical-reverse",
    template: GitgraphJS.templateExtend("blackarrow", {
        colors: ['hotpink', 'steelblue'],
        arrow: {
            color: `white`
        },
        branch: {
            mergeStyle: 'straight',
            color: 'white'
        },
        commit: {
            message: {
                font: "normal 1em system-ui",
                color: 'white'
            }
        }
    })
});
// const master = gitgraph.branch("master");
function printChange(v) {
    return `\t- ${v.type} ${v.file}`
}

// let currentBranch = master;
const scratch = {
    branches: new Set(),
    getAllBranchNames () {
        return [...this.branches]
    },
    newBranch(name, ggFrom = gitgraph) {
        if (this.branches.has(name)) {
            // branch exists
            return false; 
        }
        this.branches.add(name)
        this[name] = {
            gg: ggFrom.branch(name),
            staged: [],
            unstaged: [],
            fs: [],
            parent: ggFrom.name,

            getName() {
                return this.gg.name;
            },

            commit (k) { 
                this.staged = []
                this.gg.commit(k);
            },

            unstagedChanges () {
                return this.unstaged.map(printChange).join("\n")
            },

            stagedChanges () {
                return this.staged.map(printChange).join("\n")
            },

            addFile(v) {
                this.unstaged.push({
                    type: "created",
                    file: v
                })
                this.fs.push(v)
            },

            unstageFile(v) {
                let staged_ = [];
                let changes = [];
                for (const f of this.staged) {
                    if (f.file != v) {
                        staged_.push(f)
                    } else {
                        changes.push(f)
                    }
                }
                this.staged = staged_
                // const changes = this.unstaged.filter(f => f.file == v)
                this.unstaged = this.unstaged.concat(changes)
                return changes;
            },

            rmFile (v) {
                this.unstaged.push({
                    type: "removed",
                    file: v
                })
                this.fs[this.fs.findIndex(f => f == v)] = null
            },

            restoreFile(v) {
                this.unstaged = this.unstaged.filter(f => f.file == v)
                this.staged = this.staged.filter(f => f.file == v)
            },

            stageFile(v) {
                let unstaged_ = [];
                let changes = [];
                for (const f of this.unstaged) {
                    if (f.file != v) {
                        unstaged_.push(f)
                    } else {
                        changes.push(f)
                    }
                }
                this.unstaged = unstaged_
                // const changes = this.unstaged.filter(f => f.file == v)
                this.staged = this.staged.concat(changes)
                return changes;
            },

            doDummyCommit() {
                // this.commit("<dummy> branch created")
            },

            serialize() {
                return {
                    staged: this.staged,
                    unstaged: this.unstaged,
                    fs: this.fs,
                    parent: this.parent,
                    commits: manipulate.allCommitsInBranch(this.getName()).map(commit => commit.subject)
                }
            }
        }
        return true;
    },
    serialize() {
        const copy = {}
        for (const branch of this.branches) {
            copy[branch] = this[branch].serialize()
        }
        return JSON.stringify(copy)
    }
}

scratch.newBranch("master");
scratch["master"].doDummyCommit()
let currentBranch = scratch['master'];



const outputBox = {
    id: '#output-box',
    // idx: 0,
    clear() {
        $(this.id).innerHTML = '';
    },

    report(v, color = undefined) {
        // if (color)
        $(this.id).innerHTML += `> ${!!color ? `<span style="color: ${color}">${v}</span>` : v}\n`;
    },

    err (v) {
        this.report(v, 'tomato'); // $(this.id).innerHTML += `> <span style="color: tomato">${v}</span>\n`
    }  
}

function showStatus() {
    outputBox.report(
        `On branch ${currentBranch.getName()}
        
        Changes staged for commit:
        ${currentBranch.stagedChanges() || "None!"}

        Changes not staged for commit:
        ${currentBranch.unstagedChanges() || "None!"}
        `
    )
}

function doBranch(parts) {
    const args = parts.slice(2);
    if (args.length == 0) {
        // console.log
        outputBox.report(`CURRENT: ${currentBranch.getName()}\n` + scratch.getAllBranchNames().join('\n'))
    } else if (args.length == 1) {
        if (scratch.newBranch(args[0], currentBranch.gg)) {
            outputBox.report(`Created branch ${args[0]}`)
            scratch[args[0]].doDummyCommit()
        } else {
            outputBox.err(`Failed to create branch ${args[0]}, likely another branch with the same name already exists`)
        }
    }
}

function doLS() {
    // let v = new Set([ ...currentBranch.untracked_files, ...currentBranch.tracked_files ]);
    let vs = ""
    for (const i of currentBranch.fs) {
        vs += `- ${i}\n`
    }
    outputBox.report(
        vs.length == 0 ? "No files to display." : vs
    )
}

function doTouch(parts) {
    if (parts.length < 2) {
        outputBox.err('Not enough arguments, Need 1 arguments, Example: touch FILENAME');
        return;
    }

    const filename = parts[1];
    currentBranch.addFile(filename);
    outputBox.report(`Created file ${filename} sucessfully.`)
}

function doTestcase(parts) {
    if (parts.length < 2) {
        outputBox.err('Not enough arguments, Need 1 arguments, Example: testcase IDX');
        return;
    }

    const idx = parseInt(parts[1]);
    testcase(idx)
    
}

function doRM(parts) {
    if (parts.length < 2) {
        outputBox.err('Not enough arguments, Need 2 arguments, Example: rm FILENAME');
        return;
    }

    const filename = parts[1];
    currentBranch.rmFile(filename);
    outputBox.report(`Removed file ${filename} sucessfully.`)
}

function doAdd(parts) {
    if (parts.length < 3) {
        outputBox.err('Not enough arguments, Need atleast 2 arguments, Example: git add FILENAME');
        return;
    }

    let vs = "Staged the following:\n"
    // console.log(parts.slice(2))
    for (const file of parts.slice(2)) {
        vs += (currentBranch.stageFile(file).map(printChange).join('\n'))
    }

    outputBox.report(vs)
}

function doCommit(parts) {
    if (parts.length < 3) {
        outputBox.err('Not enough arguments, Need atleast 2 arguments, Example: git commit "MESSAGE"')
        return;
    }

    const message = parts.slice(2).join(' ');
    currentBranch.commit(message)
    outputBox.report(`Committed changes with message: ${message}`)
}

function doCheckout(parts) {
    if (parts.length != 3) {
        outputBox.err(`Invalid no of arguments, Example: git checkout BRANCHNAME
        Hint: You can find all branches with \`git branch\``)
        return;
    }

    if (scratch.branches.has(parts[2])) {
        currentBranch = scratch[parts[2]]
        outputBox.report(`Checked out ${parts[2]}`)
    } else {
        outputBox.err(`Branch ${parts[2]} does not exist`)
    }
}

function doMerge(parts) {
    console.log('wtf')
    const args = parts.slice(2)
    console.log(args)
    const help = `\nExample: git merge BRANCHNAME - Will merge into parent (do not use with master)
                             git merge CHILD PARENT - Will merge child into parent`
    if (args.length == 0) {
        pp('cp1')
        outputBox.err('Not enough arguments' + help)
        return;
    } else if (args.length == 1) {
        if (scratch.branches.has(args[0])) {
            pp('cp21')
            const child = scratch[args[0]]
            const parent = scratch[child.parent]
            parent.gg.merge(child.gg)
            outputBox.report(`Merged ${args[0]} into ${parent.gg.name}`)
            // currentBranch = scratch[args[0]]
            // outputBox.report(`Checked out ${args[0]}`)
        } else {
            pp('cp22')
            outputBox.err(`Branch ${args[0]} does not exist` + help)
            return;
        }
    } else if (args.length == 2) {
        if (scratch.branches.has(args[0]) && scratch.branches.has(args[1])) {
            pp('cp31')
            const child = scratch[args[0]]
            const parent = scratch[args[1]]
            parent.gg.merge(child.gg)
            outputBox.report(`Merged ${args[0]} into ${parent.gg.name}`)
        } else {
            pp('cp32')
            outputBox.err(`Branch ${args[0]} does not exist` + help)
            return;
        }
    }
}

function doGitRM(parts) {
    const args = parts.slice(2)
    if (args.length == 0) {
        outputBox.err('Not enough arguments')
        return;
    }
    let vs = "Unstaged the following:\n"
    // console.log(parts.slice(2))
    for (const file of args) {
        vs += (currentBranch.unstageFile(file).map(printChange).join('\n'))
    }

    outputBox.report(vs)
}

function testcase(v) {
    const cases = [
        () => manipulate.allCommitsInBranch().length >= 3,
        () => {
            const children = manipulate.childrenOfBranch();
            for (const child of children) {
                if (child == "crow") {
                    return manipulate.allCommitsInBranch("crow").length >= 5;
                }
            }
            return false;
        }
    ];
    console.log(manipulate.allCommitsInBranch())
    const result = cases[parseInt(v) - 1]();
    if (result) {
        outputBox.report(`Testcase ${v} passed`, 'yellowgreen')
    } else {
        outputBox.report(`Testcase ${v} failed`, `tomato`)
    }
}

function submitCommand() {
    // errorBox.clear();
    // outputBox.clear();
    const command = $("#command-input").value;
    console.log(command);

    const parts = command.toLowerCase().trim().split(' ');

    switch (parts[0]) {
        case "testcase":
            doTestcase(parts);
            return;
        case "touch":
            doTouch(parts);
            return;
        case "git":
            break;
        case "ls":
            doLS();
            return;
        case "rm":
            doRM(parts);
            return;
        case "flush-unstaged":
            currentBranch.unstaged = [];
            return;
    }

    if (parts.length == 1) {
        outputBox.err('Not enough arguments');
        return;
    }

    switch (parts[1]) {
        case "status":
            showStatus(parts);
            break;
        case "add":
            doAdd(parts);
            break;
        case "commit":
            doCommit(parts);
            break;
        case "branch":
            doBranch(parts);
            break;
        case "checkout":
            doCheckout(parts);
            break;
        case "merge":
            doMerge(parts);
            break;
        case "restore":
            doRestore(parts);
            break;
        case "rm":
            doGitRM(parts);
            break;
        default:
            outputBox.err("unknown git command")
            // console.log(`Unknown subcommand.`)
            break;
        // case "rm":
        //     doRemove(parts);
        //     break;
        // case "pull":
        //     doPull(parts);
        //     break;
        // case "push":
        //     doPush(parts);
        //     break;
        $("#command-input").value = ''
    }

    
}

Split([ '#content', '#git-graph' ], {
    sizes: [25, 75]
})