# Requirement Notes

Build a web application that turns a job description into a personalized interview preparation kit.

The user pastes in the job description, gives you the company's website address, and tells you how
many days they have before the interview. From there the application does the research itself: it crawls
the company site to find what they do and how they hire, looks for public discussion of that company's
interview process, and combines all of it with the job description to generate a structured kit — a
company brief, a breakdown of the role, a bank of likely questions, flashcards, and a day-by-day study
schedule. The user can then reshape any part of it, and practice against it inside the app.

## Core Idea

- user adds job description, company link & days till interview. (means user has already been shortlisted by the company for an interview and we need to proceed based on that)
- find company information (find linkedin, public search, glass-door, public rating & reviews, company website, check on employs, ceo...etc how long they been in the business, recent news/changes). Build summary, rating...other metrics based on data found.
- what we need to build :
    1. company brief
    2. a breakdown of the role (vs users current expertise and thing they lack based on the role)
    3. likely asked questions.
    4. flashcards.
    5. day-by-day what to cover till interview.
