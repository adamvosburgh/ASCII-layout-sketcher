This project is for a light static site that allows the user to draw and label simple layouts, and the site will onvert them into ascii diagrams for communicating to LLMs. 

key parts to this:
1. main interface: this is where a user can draw a layout that they want to communicate to an llm. below i am listing features in order of importance:
    - based on a grid-layout. this is for rough sketching, not perfect accuracy. i'm not really sure what the grid size should, probably relatively small, but you give it a shot based on my other notes and we'll take it from there.
    - users can places labels inside shapes. if they label is always in the center, that is fine. this is so when they get converted to ASCII, the shapes can contain instructinos like "bottom of label should be tangent to right side of this shape"
    - there should be a toolbox of basic shapes: squares, rectangles, circles, ellipses, arcs, triangles. feel free to include other primitives as you see fit. no need to include things like rounded rectanges, that can be specified afterwards. 
    - chart mode. this allows a user to drag the area for a chart of equal cell size and label the contents. maybe as a default each cell is 2 grid modules higher and 8 wide. When a user is dragging the area for the chart, it sihould say 1x2, 1x4 (in the case where they are just dragging to the right) etc.

2. convert to ascii button:
    - when a user presses this, their sketch is converted to ascii and displayed.
    - let's start with the site split in half horizontally, the left side is for drawing on the grid layout, the right side is for the ascii conversion with those labels at the top and the button on the right.
    - do some research for me to look up what width these ascii diagrams should be. e.g. what width would allow them to be pasted into a claude code prompt without wrapping the text of the diagram? 
    - similarly, research the correct way to format this on the site, so when pasted into a claude code prompt window (for example) the monospacing is preserved. Somtimes I notice that spacing size changes on ascii diagrams I draw and how they get pasted into these windows.
    - it's very important to preserve the labels here, that means that you may have to scale the features to fit the labels. or, it the labels don't fit, you may have to draw leaders lines in ascii, although let's cross this bridge when we get to it. this part could be tricky

3. styling
    - the styling of the site should be very lo-fi and ascii style. monospace fonts etc.
    - as a point of departure, reference the colors and fonts that I use in ../personal-site (relative to this directory.)
    - to get more specific from that base, text should be rgb blue, and outlines/borders etc should be a burnt sienna / organge. there should be a dotted dividing line between the two halves of the site. that should be rgb blue.

4. packages etc
    - these days, i am partial to vite for my static site development
    - let's use svelte to build reusable js components
    - the url will be ascii.adamvosburgh.com
    - i will be hosting this on my personal server. see ../advisor-lottery for an example of how I have set this up before