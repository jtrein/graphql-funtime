const fetch = require('node-fetch')
const { promisify } = require('util');
const parseXML = promisify(require('xml2js').parseString)
const {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} = require('graphql')

const userPassBase64 = new Buffer('Pahmw7edj8tZM0VcbtkLf6j8QKR2uTOpgNMKVaCg:X').toString('base64');
const options = {
  method: 'GET',
  headers: { Authorization: 'Basic ' + userPassBase64 },
}

// REFS:
//   * https://www.youtube.com/watch?v=lAJWHHUz8_8
//   * https://www.youtube.com/watch?v=RMtq0RCLuzs
//   * http://bibles.org/pages/api/documentation

const PassagesType = new GraphQLObjectType({
  name: 'Passages',
  description: '...',

  fields: () => ({
    collection: {
      type: new GraphQLList(PassageType),
      resolve: xml =>
        xml.response.search[0].result[0].passages[0].passage
    },
    display: {
      type: GraphQLString,
      resolve: xml =>
        xml.response.search[0].result[0].passages[0].passage[0].display[0]
    },
    text: {
      type: GraphQLString,
      resolve: xml =>
        xml.response.search[0].result[0].passages[0].passage[0].text[0]
    },
  }),
})

const PassageType = new GraphQLObjectType({
  name: 'Passage',
  description: '...',

  fields: () => ({
    display: {
      type: GraphQLString,
      resolve: xml => xml.display[0]
    },
    text: {
      type: GraphQLString,
      resolve: xml => xml.text[0]
    },
  }),
})

const VersionType = new GraphQLObjectType({
  name: 'Version',
  description: '...',

  fields: () => ({
    lang_name: {
      type: GraphQLString,
      resolve: ({ response }) =>
        response.versions[0].version[0].lang_name[0]
    },
    name: {
      type: GraphQLString,
      resolve: ({ response }) =>
        response.versions[0].version[0].name[0]
    },
    books: {
      type: new GraphQLList(BookType),
      resolve: ({ id }) => {
        return fetch(
          `https://bibles.org/v2/versions/${id}/books.xml`,
          options
        )
        .then(res => res.text())
        .then(res => parseXML(res))
        .then(res => res.response.books[0].book)
      }
    },
  }),
})

const BookType = new GraphQLObjectType({
  name: 'Book',
  description: '...',

  fields: () => ({
    name: {
      type: GraphQLString,
      resolve: res => res.name[0]
    },
    testament: {
      type: GraphQLString,
      resolve: res => res.testament[0]
    }
  })
})

const ChapterType = new GraphQLObjectType({
  name: 'Chapter',
  description: '...',

  fields: () => ({
    number: {
      type: GraphQLString,
      resolve: res => res.chapter[0]
    },
    next: {
      type: GraphQLString,
      resolve: res => res.next[0].chapter[0].name[0]
    },
    parent: {
      type: GraphQLString,
      resolve: res => res.parent[0].book[0].name[0]
    },
    previous: {
      type: GraphQLString,
      resolve: res => {
        if (res.previous) return res.previous[0].chapter[0].name[0]
      }
    },
  })
})

const ChaptersType = new GraphQLObjectType({
  name: 'Chapters',
  description: '...',

  fields: () => ({
    collection: {
      type: new GraphQLList(ChapterType),
      resolve: xml => xml.response.chapters[0].chapter
    }
  })
})

module.exports = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    description: '...',

    fields: () => ({
      chapters: {
        type: ChaptersType,
        args: {
          id: { type: GraphQLString },
          version: { type: GraphQLString },
        },
        resolve: (root, { id = 'Gen', version = 'eng-KJV' }) => (
          fetch(
            `https://bibles.org/v2/books/${version}:${id}/chapters.xml`,
            options
          )
          .then(res => res.text())
          .then(res => parseXML(res))
        ),
      },
      passage: {
        type: PassagesType,
        args: {
          id: { type: GraphQLString },
          version: { type: GraphQLString },
        },
        resolve: (root, { id, version = 'eng-KJV' }) => (
          fetch(
            `https://bibles.org/v2/passages.xml?q[]=${id}&version=${version}`,
            options
          )
          .then(res => res.text())
          .then(res => parseXML(res))
        ),
      },
      version: {
        type: VersionType,
        args: {
          id: { type: GraphQLString },
        },
        resolve: (root, { id }) => (
          fetch(
            `https://bibles.org/v2/versions/${id}.xml`,
            options
          )
          .then(res => res.text())
          .then(res => parseXML(res))
          .then(res => Object.assign({}, res, { id }))
        ),
      },
    }),
  }),
})