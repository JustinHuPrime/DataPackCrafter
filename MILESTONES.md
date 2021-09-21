# Milestone 1

Our DSL is a Minecraft datapack creator. Minecraft is a sandbox videogame, and Minecraft datapacks are JSON files the game uses to define many of its game rules - for example, achievements, the conditions to get an achievement, and the reward for getting an achievement are all specified using datapacks. The JSON structure expected by Minecraft, however, is optimized for machine-interpretability, not human-friendliness. Our DSL enables easier human writing of Minecraft datapacks.

Our DSL needs to make a strict distinction between actions and computation that happen within Minecraft and actions and computation that happen during datapack creation - while it is possible to perform arbitrary computation within Minecraft, this is far too difficult for us to accomplish in the limited time we have. The DSL is a functional-style language with special syntactic forms that interact with a global store to create Minecraft objects, like advancements or Minecraft functions (a Minecraft function is a straight-line sequence of in-game commands that is named and can be called, but that does not have user-defined arguments). At the end of evaluation, the contents of the global store are produced as JSON files for use in Minecraft.

The DSL has a fairly limited type system - there exist numbers, strings, booleans, and heterogenous lists. Types are dynamically checked, and certain syntactic forms impose additional restrictions on the data they recieve - for example, you shouldn't try to invoke a (Minecraft) function that doesn't exist. These checks are enforced during DSL evaluation time. You can interoperate with existing datapacks through the use of the `import` declaration, which points the DSL at an external datapack that provides advancements, functions, and other Minecraft objects.

During the meeting with our TA, Yanze mentioned that we might not need to implement DSL-level functions to have a complex enough language. We've decided to keep DSL-level functions in for now - we might remove them later.

We now need to do a user study and actually implement the rest of the language. We might also need to tweak some of the precedence rules in our grammar - for example, do we really want `import` to bind as loosely as possible? Finally, additional examples and their outputs should be defined.

# Milestone 2

Division of responsibilties - see issue assignments in Github Issues

Do Milestone 3 Content This Week

Roadmap - See github issues for list of tasks, tasks with assigned milestones to be done before that milestone is due - we want to finish a first draft of the DSL during Milestone 3

Draft grammar and examples - done

Summary of progress - see git history - we added a grammar, examples, and wrote the AST - we're planning on hand-rolling our lexer and parser
