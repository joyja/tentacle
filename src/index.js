#!/usr/bin/env node
require('make-promises-safe')
const { start } = require('./server')
start('tentacle-edge')

// const { Controller, TagList, Tag } = require('tentacle-ethernet-ip')

// // test.todo('to do');
// // it('works', async () => {
// const PLC = new Controller()
// const tagList = new TagList()
// const tag = new Tag('RTU44A_13XFR9_FIT_001_FI')
// PLC.connect('127.0.0.1').then(async () => {
//   await PLC.readTag(tag)
//   console.log(tag.value)
//   await PLC.getControllerTagList(tagList)
//   console.log(tagList.tags)
//   console.log(tagList.templates)
//   console.log(tagList.programs)
// })
