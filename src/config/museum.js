// Vision Storms Museum of American Heritage: layout and exhibit text.
// World metres; x runs west->east, z runs north (negative) -> south. The building sits on the empty lot east of the
// Reign Gallery, at the north end of the avenue. Its front door faces west onto a promenade. Everything here is
// original artwork built in code (no logos, no real-brand copies); the facts on the placards are historical.

export const CURB = 0.15
export const MUSEUM = { x0: 24, x1: 70, z0: -122, z1: -84 }
export const MUS_FLOOR = 0.45 // top of the podium floor (two 0.15 m steps up from the sidewalk)
export const MUS_H = 13 // outer wall height above the floor
export const MUS_CEIL = 11 // interior ceiling height above the floor
export const MUS_DOOR_Z = -103
export const MUS_ZONE = 'museum'
export const ROTUNDA = { x: 47, z: -103, r: 9 }

// colours (restrained: cream stone, walnut, brass, with the Stars and Stripes colours as accents)
export const MUS_COL = { stone: '#e8e2d4', wall: '#ece6d9', walnut: '#4a3022', brass: '#c9a24a', navy: '#1f2f5c', red: '#a8322d', cream: '#f4efe2' }

/**
 * Every exhibit with a placard. `pos` is where you stand to read it ([x, z]); `look` is the point on the exhibit.
 * Text is short and factual. `facts` are bullet points shown under the paragraph.
 */
export const EXHIBITS = [
  { id: 'map', hall: 'Foyer', title: 'A Nation of States', kicker: 'Orientation',
    body: 'The United States has fifty states and a federal district. The original thirteen, strung along the Atlantic coast, declared independence in 1776. The map beside you marks the museum\'s halls.',
    facts: ['Alaska became the 49th state on January 3, 1959, and Hawaii the 50th on August 21, 1959.', 'The fifty states stretch across six time zones.', 'Admission to this museum is always free.'] },
  { id: 'bell', hall: 'Founding & Democracy', title: 'The Liberty Bell', kicker: 'Replica',
    body: 'A bell for the Pennsylvania State House was cast in London in 1752. It cracked soon after arriving and was recast twice in Philadelphia in 1753. In the 1830s abolitionists adopted it as a symbol of liberty, and the name "Liberty Bell" stuck.',
    facts: ['It weighs about 2,080 pounds (943 kg).', 'Its inscription, from the Book of Leviticus, reads: "Proclaim LIBERTY throughout all the Land unto all the Inhabitants thereof."', 'Try it: this replica is made to be rung.'] },
  { id: 'declaration', hall: 'Founding & Democracy', title: 'The Declaration of Independence', kicker: 'July 4, 1776',
    body: 'The Second Continental Congress adopted the Declaration on July 4, 1776, explaining why the thirteen colonies were separating from Great Britain. Its second paragraph became one of the most quoted sentences in American history.',
    facts: ['"We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness."', 'Most delegates signed the engrossed copy on August 2, 1776.'] },
  { id: 'constitution', hall: 'Founding & Democracy', title: 'We the People', kicker: 'The Constitution',
    body: 'Delegates wrote the Constitution in Philadelphia in the summer of 1787. It took effect in 1789 after ratification by the states. Its preamble sets out the purpose of the new government.',
    facts: ['The first ten amendments, the Bill of Rights, were ratified in 1791.', 'The 13th Amendment (1865) ended slavery, the 15th (1870) barred denying the vote on account of race, and the 19th (1920) guaranteed women the vote.', 'The Voting Rights Act of 1965 enforced those promises.'] },
  { id: 'flag', hall: 'Founding & Democracy', title: 'The Stars and Stripes', kicker: 'The flag',
    body: 'Congress set the first flag design in 1777: thirteen stripes and thirteen stars for the thirteen states. A star has been added for each new state since. The current fifty-star flag has flown since July 4, 1960.',
    facts: ['Flag Day is June 14, the anniversary of the 1777 resolution.', 'The seven red and six white stripes recall the original colonies.'] },
  { id: 'lunch-counter', hall: 'Voices for Equality', title: 'The Lunch Counter Sit-ins', kicker: 'February 1, 1960',
    body: 'On February 1, 1960, four college students from North Carolina A&T sat down at a whites-only lunch counter in Greensboro, North Carolina, and politely asked to be served. They were refused and stayed until closing. Within weeks, sit-ins spread to dozens of cities.',
    facts: ['By the summer of 1960 the Greensboro counter had been integrated.', 'The Civil Rights Act of 1964 banned segregation in public places.', 'Sit down at the counter: the stools are yours.'] },
  { id: 'golden-door', hall: 'Voices for Equality', title: 'The Golden Door', kicker: 'Immigration',
    body: 'The Statue of Liberty, a gift from France designed by Frédéric Auguste Bartholdi, was dedicated in New York Harbor on October 28, 1886. Millions of immigrants arrived beneath her torch. The trunks beside the replica torch stood for everything a family could carry.',
    facts: ['The Ellis Island immigration station opened on January 1, 1892.', 'About twelve million people were processed there before it closed in 1954.'] },
  { id: 'trex', hall: 'Land & Life', title: 'Tyrannosaurus rex', kicker: 'Fossil skeleton (cast)',
    body: 'Tyrannosaurus rex lived in western North America about 68 to 66 million years ago. The species was named in 1905 by paleontologist Henry Fairfield Osborn from fossils found in Montana. This skeleton is a cast, posed as it might have walked.',
    facts: ['Adults reached about 12 meters (40 feet) in length.', 'They may have weighed around 8,000 kilograms.', 'The bite force of a large adult is among the strongest ever estimated for a land animal.'] },
  { id: 'gems', hall: 'Land & Life', title: 'Treasures of the American Earth', kicker: 'Minerals',
    body: 'The United States holds a remarkable range of minerals. This case shows amethyst, turquoise, quartz and pyrite, each with a story behind its colour.',
    facts: ['Amethyst is quartz coloured purple by traces of iron; it is the state gemstone of South Carolina.', 'Turquoise is a state gemstone of Arizona and New Mexico.', 'Pyrite, "fool\'s gold", is iron sulfide; prospectors in the Gold Rush often mistook it for the real thing.'] },
  { id: 'triceratops', hall: 'Land & Life', title: 'Triceratops', kicker: 'Skull cast',
    body: 'Triceratops roamed western North America about 68 to 66 million years ago, alongside Tyrannosaurus rex. Its name means "three-horned face": two long brow horns, a shorter nose horn, and a wide bony frill that may have helped it recognize other Triceratops or deter predators.',
    facts: ['A full skull could grow to about 2 meters (7 feet) long, the largest of any known land animal.', 'It was a plant-eater, using its sharp beak to clip tough vegetation.', 'First described in 1889 by paleontologist Othniel Charles Marsh.'] },
  { id: 'raptor', hall: 'Land & Life', title: 'Velociraptor', kicker: 'Skeleton cast',
    body: 'Velociraptor lived in what is now Mongolia about 75 to 71 million years ago, smaller and quicker than its movie reputation suggests. It hunted on two legs and carried an enlarged, curved claw on each foot, raised off the ground to stay sharp.',
    facts: ['About the size of a turkey: roughly 2 meters (6.5 feet) long, but only about 0.5 meters (1.6 feet) tall at the hip.', 'Fossil evidence shows it was feathered.', 'A famous 1971 fossil find, the "Fighting Dinosaurs," captured one locked in combat with a Protoceratops.'] },
  { id: 'biplane', hall: 'Flight & Space', title: 'The First Flight', kicker: 'December 17, 1903',
    body: 'Near Kitty Hawk, North Carolina, Orville and Wilbur Wright made the first powered, controlled, sustained flights of a heavier-than-air machine. The first flight lasted 12 seconds and covered 120 feet. The brothers made four flights that day.',
    facts: ['The longest flight of the day lasted 59 seconds and covered 852 feet.', 'The Flyer\'s wingspan was about 40 feet (12.3 meters).', 'This hanging display is an original model inspired by early biplanes.'] },
  { id: 'monoplane', hall: 'Flight & Space', title: 'Across the Atlantic', kicker: 'May 1927',
    body: 'On May 20 and 21, 1927, Charles Lindbergh flew alone and non-stop from New York to Paris in about 33 and a half hours, covering roughly 3,600 miles. Five years later to the day, Amelia Earhart became the first woman to fly solo across the Atlantic.',
    facts: ['Long-range monoplanes like this carried extra fuel tanks where a cockpit window would normally be.', 'This hanging display is an original model inspired by 1920s long-distance aircraft.'] },
  { id: 'capsule', hall: 'Flight & Space', title: 'Apollo Command Module', kicker: 'Scale model',
    body: 'On July 20, 1969, Apollo 11 landed on the Moon. Twelve people walked on the Moon across six landings between 1969 and 1972. The command module was the only part of the huge Apollo spacecraft to return to Earth, splashing down in the Pacific.',
    facts: ['A command module was about 3.9 meters (12.8 feet) across.', 'Its heat shield survived re-entry at about 25,000 miles per hour.'] },
  { id: 'rocket', hall: 'Flight & Space', title: 'Launch Vehicle', kicker: 'About 1:12 scale',
    body: 'The Saturn V launched every Apollo mission to the Moon. Standing 363 feet tall, it remains the most powerful rocket to have flown successfully. This is a model at roughly one-twelfth scale.',
    facts: ['Its five first-stage engines produced about 7.6 million pounds of thrust.', 'It was also used to launch the Skylab space station in 1973.'] },
  { id: 'car', hall: 'Industry & Innovation', title: 'The Automobile Age', kicker: 'The 1910s',
    body: 'In 1908 the Model T put the automobile within reach of ordinary families. In 1913 a moving assembly line cut the time to build one chassis from about twelve hours to about an hour and a half. Over fifteen million were built before production ended in 1927.',
    facts: ['This car is an original design in the style of the 1910s; it carries no maker\'s badge.', 'Mass production changed factories, wages and cities.'] },
  { id: 'wagon', hall: 'Industry & Innovation', title: 'Westward on the Trail', kicker: 'The 1840s to 1860s',
    body: 'Hundreds of thousands of settlers crossed the continent in covered wagons along the Oregon, California and Mormon trails. The Oregon Trail ran about 2,000 miles and took four to six months, with wagons pulled by oxen or mules.',
    facts: ['An estimated 400,000 emigrants used these trails.', 'Wagons were small and packed tight: roughly 1,600 pounds of food and tools, and almost no room to ride.'] },
  { id: 'locomotive', hall: 'Industry & Innovation', title: 'Joining the Coasts', kicker: 'May 10, 1869',
    body: 'The transcontinental railroad was completed on May 10, 1869, when the Central Pacific and Union Pacific lines met at Promontory Summit, Utah, and a ceremonial golden spike was driven. A journey that once took months now took about a week.',
    facts: ['Wood-burning 4-4-0 locomotives, called the "American" type, were the workhorses of the era.', 'This locomotive is an original design with no railroad markings.'] },
  { id: 'telegraph', hall: 'Industry & Innovation', title: 'What Hath God Wrought', kicker: 'The telegraph',
    body: 'On May 24, 1844, Samuel Morse sent the first message over a long-distance telegraph line from Washington, D.C., to Baltimore: "What hath God wrought." News that once took days could now travel in seconds.',
    facts: ['Morse code uses short and long signals, dots and dashes, for each letter.', 'Tap the key to send a message of your own.'] },
  { id: 'piano', hall: 'Sound of America', title: 'The American Piano', kicker: 'Ragtime to jazz',
    body: 'Ragtime, born in the American Midwest in the 1890s, put the piano at the center of popular music. Scott Joplin\'s "Maple Leaf Rag" (1899) was one of the first big sheet-music hits. The piano went on to carry blues, jazz and gospel.',
    facts: ['This piano is ready to play: it performs "Oh! Susanna," written by Stephen Foster in 1848.'] },
  { id: 'drums', hall: 'Sound of America', title: 'Jazz', kicker: 'New Orleans and beyond',
    body: 'Jazz grew from blues, ragtime and brass-band music in New Orleans around the turn of the twentieth century. Drummers combined the bass drum, snare and cymbals into the drum kit, using a bass-drum pedal that appeared around 1900.',
    facts: ['The saxophone was patented by Adolphe Sax in 1846 and became a signature voice of jazz.'] },
  { id: 'guitar', hall: 'Sound of America', title: 'The Electric Guitar', kicker: 'Rock and roll',
    body: 'Electric guitars grew popular in the 1930s and 1940s. Solid-body models went into regular production around 1950, and their sound drove rock and roll, blues and country.',
    facts: ['Blues grew from the Mississippi Delta, and Nashville\'s Grand Ole Opry began broadcasting in 1925.'] },
  { id: 'jukebox', hall: 'Sound of America', title: 'The Jukebox', kicker: 'Records for a nickel',
    body: 'Coin-operated jukeboxes spread through diners and bars in the 1930s. The 45 rpm single arrived in 1949 and filled them with the hits of the 1950s. In the 1970s a new sound, hip hop, began at neighborhood parties in the Bronx, New York.',
    facts: ['Press the button to play a record.'] },
]

export const EXHIBIT = Object.fromEntries(EXHIBITS.map((e) => [e.id, e]))

/** The museum's staff (see config/staff.js for the roster format). */
export const MUS_HALLS = ['Foyer', 'Founding & Democracy', 'Voices for Equality', 'Land & Life', 'Flight & Space', 'Industry & Innovation', 'Sound of America']
