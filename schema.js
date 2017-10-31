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
//   * http://bibles.org/pages/api/documentation

const PassageType = new GraphQLObjectType({
  name: 'Passage',
  description: '...',

  fields: () => ({
    display: {
      type: GraphQLString,
      resolve: xml =>
        xml.response.search[0].result[0].passages[0].passage[0].display[0]
    },
    text: {
      type: GraphQLString,
      resolve: xml =>
        xml.response.search[0].result[0].passages[0].passage[0].text[0]
    }
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
      resolve: (res) =>
        res.name[0]
    },
    testament: {
      type: GraphQLString,
      resolve: (res) =>
        res.testament[0]
    }
  })
})

module.exports = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    description: '...',

    fields: () => ({
      passage: {
        type: PassageType,
        args: {
          id: { type: GraphQLString },
        },
        resolve: (root, args) => (
          fetch(
            `https://bibles.org/v2/passages.xml?q[]=${args.id}&version=eng-KJVA`,
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