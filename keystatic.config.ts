import { config, fields, singleton, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },

  singletons: {
    homepage: singleton({
      label: 'Homepage',
      path: 'src/content/singletons/homepage',
      schema: {
        heroImage: fields.text({ label: 'Hero image path (e.g. /images/2024/03/photo.jpg)' }),
        heroTitleEn: fields.text({ label: 'Hero title (EN)' }),
        heroTitleEs: fields.text({ label: 'Hero title (ES)' }),
        heroSubtitleEn: fields.text({ label: 'Hero subtitle (EN)', multiline: true }),
        heroSubtitleEs: fields.text({ label: 'Hero subtitle (ES)', multiline: true }),
        aboutTitleEn: fields.text({ label: 'About title (EN)' }),
        aboutTitleEs: fields.text({ label: 'About title (ES)' }),
        aboutSubtitleEn: fields.text({ label: 'About subtitle (EN)' }),
        aboutSubtitleEs: fields.text({ label: 'About subtitle (ES)' }),
        aboutBodyEn: fields.text({ label: 'About body (EN)', multiline: true }),
        aboutBodyEs: fields.text({ label: 'About body (ES)', multiline: true }),
        aboutImage: fields.text({ label: 'About image path (e.g. /images/2023/06/photo.jpg)' }),
      },
    }),

    classes: singleton({
      label: 'Classes & Schedule',
      path: 'src/content/singletons/classes',
      schema: {
        heroImage: fields.text({ label: 'Hero image path' }),
        introEn: fields.text({ label: 'Intro text (EN)', multiline: true }),
        introEs: fields.text({ label: 'Intro text (ES)', multiline: true }),
        classes: fields.array(
          fields.object({
            dayEn: fields.text({ label: 'Day(s) (EN)' }),
            dayEs: fields.text({ label: 'Day(s) (ES)' }),
            levelEn: fields.text({ label: 'Level badge (EN)' }),
            levelEs: fields.text({ label: 'Level badge (ES)' }),
            titleEn: fields.text({ label: 'Class title (EN)' }),
            titleEs: fields.text({ label: 'Class title (ES)' }),
            location: fields.text({ label: 'Location' }),
            time: fields.text({ label: 'Time (e.g. 17:45–18:45)' }),
            descriptionEn: fields.text({ label: 'Description (EN)', multiline: true }),
            descriptionEs: fields.text({ label: 'Description (ES)', multiline: true }),
            priceEn: fields.text({ label: 'Price (EN)' }),
            priceEs: fields.text({ label: 'Price (ES)' }),
            promoEn: fields.text({ label: 'Promo text (EN, optional)', multiline: true }),
            promoEs: fields.text({ label: 'Promo text (ES, optional)', multiline: true }),
          }),
          {
            label: 'Classes',
            itemLabel: (props) => props.fields.titleEn.value || 'Class',
          }
        ),
      },
    }),

    team: singleton({
      label: 'Team (Who We Are)',
      path: 'src/content/singletons/team',
      schema: {
        heroImage: fields.text({ label: 'Hero image path' }),
        introEn: fields.text({ label: 'Intro text (EN)', multiline: true }),
        introEs: fields.text({ label: 'Intro text (ES)', multiline: true }),
        members: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            bioEn: fields.text({ label: 'Bio (EN)', multiline: true }),
            bioEs: fields.text({ label: 'Bio (ES)', multiline: true }),
            photo: fields.text({ label: 'Photo path (e.g. /images/2023/11/photo.jpg)' }),
            profileLinkEn: fields.text({ label: 'Profile page link EN (optional)' }),
            profileLinkEs: fields.text({ label: 'Profile page link ES (optional)' }),
          }),
          {
            label: 'Team members',
            itemLabel: (props) => props.fields.name.value || 'Member',
          }
        ),
      },
    }),

    partners: singleton({
      label: 'Our Partners',
      path: 'src/content/singletons/partners',
      schema: {
        heroImage: fields.text({ label: 'Hero image path' }),
        introEn: fields.text({ label: 'Intro text (EN)', multiline: true }),
        introEs: fields.text({ label: 'Intro text (ES)', multiline: true }),
        partners: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            descriptionEn: fields.text({ label: 'Description (EN)', multiline: true }),
            descriptionEs: fields.text({ label: 'Description (ES)', multiline: true }),
          }),
          {
            label: 'Partners',
            itemLabel: (props) => props.fields.name.value || 'Partner',
          }
        ),
      },
    }),

    danceStyles: singleton({
      label: 'Dance Styles',
      path: 'src/content/singletons/dance-styles',
      schema: {
        introEn: fields.text({ label: 'Page intro paragraph 1 (EN)', multiline: true }),
        introEs: fields.text({ label: 'Page intro paragraph 1 (ES)', multiline: true }),
        intro2En: fields.text({ label: 'Page intro paragraph 2 (EN)', multiline: true }),
        intro2Es: fields.text({ label: 'Page intro paragraph 2 (ES)', multiline: true }),
        styles: fields.array(
          fields.object({
            id: fields.text({ label: 'Anchor ID (e.g. bachata)' }),
            nameEn: fields.text({ label: 'Name (EN)' }),
            nameEs: fields.text({ label: 'Name (ES)' }),
            tagline: fields.text({ label: 'Tagline (optional, e.g. Música del Amargue)' }),
            descriptionEn: fields.text({ label: 'Description (EN)', multiline: true }),
            descriptionEs: fields.text({ label: 'Description (ES)', multiline: true }),
            image: fields.text({ label: 'Image path (e.g. /images/2023/12/photo.jpg)' }),
            learnMoreLinkEn: fields.text({ label: 'Learn more link (EN, optional)' }),
            learnMoreLinkEs: fields.text({ label: 'Learn more link (ES, optional)' }),
          }),
          {
            label: 'Dance styles',
            itemLabel: (props) => props.fields.nameEn.value || 'Style',
          }
        ),
      },
    }),

    whereToDance: singleton({
      label: 'Where to Dance',
      path: 'src/content/singletons/where-to-dance',
      schema: {
        heroImage: fields.text({ label: 'Hero image path' }),
        introEn: fields.text({ label: 'Intro text (EN)', multiline: true }),
        introEs: fields.text({ label: 'Intro text (ES)', multiline: true }),
        noteEn: fields.text({ label: 'Caveat/note text (EN)', multiline: true }),
        noteEs: fields.text({ label: 'Caveat/note text (ES)', multiline: true }),
        parties: fields.array(
          fields.object({
            dayEn: fields.text({ label: 'Day label (EN)' }),
            dayEs: fields.text({ label: 'Day label (ES)' }),
            dayNoteEn: fields.text({
              label: 'Note for this day (EN, optional)',
              multiline: true,
            }),
            dayNoteEs: fields.text({
              label: 'Note for this day (ES, optional)',
              multiline: true,
            }),
            // Events encoded as one per line: "Name | Location | Styles EN | Styles ES | URL (optional)"
            // Nested arrays are not supported in Keystatic — use this text format instead.
            eventsRaw: fields.text({
              label: 'Events — one per line: Name | Location | Styles (EN) | Styles (ES) | URL (optional)',
              multiline: true,
            }),
          }),
          {
            label: 'Day groups',
            itemLabel: (props) => props.fields.dayEn.value || 'Day',
          }
        ),
      },
    }),
  },

  collections: {
    blog: collection({
      label: 'Blog posts',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        pubDate: fields.date({ label: 'Publish date' }),
        author: fields.text({ label: 'Author' }),
        lang: fields.select({
          label: 'Language',
          options: [
            { label: 'English', value: 'en' },
            { label: 'Spanish', value: 'es' },
          ],
          defaultValue: 'en',
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value,
        }),
        image: fields.image({
          label: 'Cover image',
          directory: 'public/images/blog',
          publicPath: '/images/blog/',
        }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        content: fields.markdoc({ label: 'Content' }),
      },
    }),
  },
});
