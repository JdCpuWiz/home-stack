# project-idea.md

I have a self hosted grocery list manager named Koffan, i want to make a module similar to this and add it to home-stack

## Must haves ##
- create new tables for this in the homestack database (postgres)
- grocery list functionality:
    - store area (produce, canned goods, frozen, meat); drop down selection
    - store (Walmart, Sam's Club, Aldi); drop down selection
    - list item
    - quantity
    - purchased check box (once checked the item is removed from the list, but saved to be added again on future lists)
- when creating a new list the user should select which store first and then then be able to choose a store area, then add list items
- perhaps the "create list" and "shopping" are 2 seperate modes
- keep a history of when the list was "shopped" and what items were cleared
- have an option to clear an entire list from a store without saving the shopped history, as if the user wants to start over
- maybe an option to complete the shopping trip and close remaining list items for that store

stylized view of list items for the shopping mode, with shaded boxes around the list and alternating shades of grey for each list item
radio buttons or some other cool feature to check off each list item
ensure hover coloring for immediate feedback when selecting list items


