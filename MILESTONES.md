# Milestone 1

Our DSL is a Minecraft datapack creator. Minecraft is a sandbox videogame, and Minecraft datapacks are JSON files the game uses to define many of its game rules - for example, achievements, the conditions to get an achievement, and the reward for getting an achievement are all specified using datapacks. The JSON structure expected by Minecraft, however, is optimized for machine-interpretability, not human-friendliness. Our DSL enables easier human writing of Minecraft datapacks.

Our DSL needs to make a strict distinction between actions and computation that happen within Minecraft and actions and computation that happen during datapack creation - while it is possible to perform arbitrary computation within Minecraft, this is far too difficult for us to accomplish in the limited time we have. The DSL is a functional-style language with special syntactic forms that interact with a global store to create Minecraft objects, like advancements or Minecraft functions (a Minecraft function is a straight-line sequence of in-game commands that is named and can be called, but that does not have user-defined arguments). At the end of evaluation, the contents of the global store are produced as JSON files for use in Minecraft.

The DSL has a fairly limited type system - there exist numbers, strings, booleans, and heterogenous lists. Types are dynamically checked, and certain syntactic forms impose additional restrictions on the data they recieve - for example, you shouldn't try to invoke a (Minecraft) function that doesn't exist. These checks are enforced during DSL evaluation time. You can interoperate with existing datapacks through the use of the `import` declaration, which points the DSL at an external datapack that provides advancements, functions, and other Minecraft objects.

During the meeting with our TA, Yanze mentioned that we might not need to implement DSL-level functions to have a complex enough language. We've decided to keep DSL-level functions in for now - we might remove them later.

We now need to do a user study and actually implement the rest of the language. We might also need to tweak some of the precedence rules in our grammar - for example, do we really want `import` to bind as loosely as possible? Finally, additional examples and their outputs should be defined.

# Milestone 2

For division of responsibilities, we're using Github Issues (see <https://github.com/JustinHuPrime/DataPackCrafter/issues>). See the assignment of people to issues. We also plan to try to finish off Milestone 3's content this week in order to have some slack time in case we fall behind later. We have assigned milestones to deadlines and assigned issues to be finished before those deadlines. We'd like to finish a first draft at the DSL implementation by milestone 3's deadline. See `datapack.g4` for the draft grammar and the `examples` folder for examples. Finally, this past week we created a draft grammar, examples, and the AST for the language.

# Milestone 3

We are currently working on the user study - part of our group is working on that in parallel with the other group. We are also implementing the DSL before changes from the user study in order to reduce workload during milestone 4. After the user study is complete, we will note down the changes to be made and make them during milestone 4.

The user study was conducted using this google doc: https://docs.google.com/document/d/1-FkeVnwK4Y5bahaR93pCqiHJJU21xNFJCOsR8H3_BaM/edit?usp=sharing

We found that the biggest confusion for our users was the on blocks which only allow very particular things within them (minecraft commands). We tried to come up with something that would work around this confusion, and we found that it would probably need to be a very large fundamental change to try and make this more clear or to allow for any expression in these blocks. The other thing we found was that the activity that we got our users to do had an intended solution of recursion and both users gravitated to doing it iteratively even though the iterative solution is more cumbersome. This might be due to coming to the conclusion that they should use recursion is somewhat uncommon. We will be having further discussions of the results and if there are any feasible changes at a later date.

# Milestone 4

At this point, most of the individual components for our DSL (lexer, parser, evaluator, and output generator) are complete. We plan to finish all individual components by Wednesday (Oct 6), and integrate them into a draft implementation by Friday (Oct 8). Next week, we will make further changes to our DSL, time permitting, based on the result of the final user study.

We are planning to change up the user study slightly so that we aren't relying on people defaulting to recursion for solving the problem. We have at least one participant scheduled for next week all lined up.

# Milestone 5

This week, our goal is to fix up remaining bugs and write up more user-focused documentation for our language - the latter will outline language features (roughly sorted by type) with examples. Our final user study is scheduled for Thursday, Oct 14, and we will try to incorporate this feedback into our final implementation. We will work on the presentation video over the weekend.

User study update: The final user study went well; the task we gave the user was creating a data pack that gave you 10 extra food of the same type whenever you ate an apple, steak, carrot, or cooked chicken. Although the idea was to abstract this using a `for` loop, the user did this using 4 separate `on` triggers (Minecraft advancement / event triggers), which works the same but is a bit less compact.

There was still some lingering confusion on the separation between DSL event triggers and Minecraft commands: for example, we can't ask _inside_ the trigger (i.e. in Minecraft's runtime) which item was actually eaten and do something different each time. This would've required translating core constructs like `if` statements to Minecraft commands, which we did not have time to dive deep into. Instead, we need to add one trigger for each consumed item and a _consistent_ action for each one.

Despite this design limitation, we did try to make our language more flexible with regards to what can go inside event triggers. For instance, the language now accepts feeding a list of string commands to `on` blocks instead of a single raw command string or checked command (grant/revoke/execute). This means that you can now do things like generate multiple commands on the fly using `for` expressions or recursive calls.
