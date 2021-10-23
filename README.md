# DDL Parser

## What is this
This library parses out DDL Parse Tree's from WiiU and 3DS game dumps. At the moment it does not do anything besides parse and build the tree

## What is a DDL Parse Tree
In short some games contain references to their imported NEX methods/classes/parameters in their data segment, which can be used to get the real names and data structures of each NEX protocol. Not all titles contain DDL Parse Tree's, and a title can contain more than one. For more information see [here](https://github.com/kinnay/NintendoClients/wiki/DDL-Parse-Trees)

## TODO
- Finish this. Not every DDL type is implemented
- Make this useful. Right now it just parses and builds the tree's, but it does not help with documentation at all