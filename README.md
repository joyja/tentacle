# Tentacle

[![GitHub](https://img.shields.io/github/license/joyja/tentacle)](https://github.com/joyja/tentacle/blob/master/LICENSE)
![Travis (.com)](https://img.shields.io/travis/com/joyja/tentacle)
[![Coverage Status](https://coveralls.io/repos/github/joyja/tentacle/badge.svg)](https://coveralls.io/github/joyja/tentacle)
[![Known Vulnerabilities](https://snyk.io/test/github/joyja/tentacle/badge.svg?targetFile=package.json)](https://snyk.io/test/github/joyja/tentacle?targetFile=package.json)

A nodejs industrial automation edge gateway with a GraphQL API.

## Interface

- [GraphQL](https://github.com/prisma-labs/graphql-yoga)

## Protocols

- [Ethernet/IP](https://github.com/cmseaton42/node-ethernet-ip)
- [Modbus/TCP](https://github.com/yaacov/node-modbus-serial)

## Services

- [MQTT (Sparkplug B)](https://github.com/eclipse/tahu/tree/master/client_libraries/javascript/sparkplug-client)

## GraphQL API

<!-- START graphql-markdown -->

# Schema Types

<details>
  <summary><strong>Table of Contents</strong></summary>

  * [Query](#query)
  * [Mutation](#mutation)
  * [Objects](#objects)
    * [AuthPayload](#authpayload)
    * [Device](#device)
    * [EthernetIP](#ethernetip)
    * [EthernetIPSource](#ethernetipsource)
    * [Modbus](#modbus)
    * [ModbusSource](#modbussource)
    * [Mqtt](#mqtt)
    * [MqttSource](#mqttsource)
    * [ScanClass](#scanclass)
    * [Service](#service)
    * [Tag](#tag)
    * [User](#user)
  * [Enums](#enums)
    * [Datatype](#datatype)
    * [ModbusRegisterType](#modbusregistertype)
  * [Scalars](#scalars)
    * [Boolean](#boolean)
    * [DateTime](#datetime)
    * [ID](#id)
    * [Int](#int)
    * [String](#string)

</details>

## Query
Read only queries

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>tags</strong></td>
<td valign="top">[<a href="#tag">Tag</a>!]!</td>
<td>

Requires a valid authorization token. List of all tags configured in this gateway

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>scanClasses</strong></td>
<td valign="top">[<a href="#scanclass">ScanClass</a>!]!</td>
<td>

Requires a valid authorization token. ist of all scan classes configured in this gateway

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>devices</strong></td>
<td valign="top">[<a href="#device">Device</a>!]!</td>
<td>

Requires a valid authorization token. List of all devices configured in this gateway

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">type</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>services</strong></td>
<td valign="top">[<a href="#service">Service</a>!]!</td>
<td>

Requires a valid authorization token. List of all services configured in this gateway

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">type</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
</tbody>
</table>

## Mutation
Read/Write queries

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>login</strong></td>
<td valign="top"><a href="#authpayload">AuthPayload</a></td>
<td>

If a valid username and password is provided, this will return an auth payload with a java web token to be used for future requests 
and information about the user that successfully logged in.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">username</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">password</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>changePassword</strong></td>
<td valign="top"><a href="#user">User</a></td>
<td>

Allows the user to change their password

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">oldPassword</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">newPassword</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createScanClass</strong></td>
<td valign="top"><a href="#scanclass">ScanClass</a></td>
<td>

Requires a valid authorization token. Creates a new scan class

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">rate</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateScanClass</strong></td>
<td valign="top"><a href="#scanclass">ScanClass</a></td>
<td>

Requires a valid authorization token. Updates an existing scan class

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">rate</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteScanClass</strong></td>
<td valign="top"><a href="#scanclass">ScanClass</a></td>
<td>

Requires a valid authorization token. Deletes a scan class. Will not be successfully if there are tags currently assigned to this scan class.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createTag</strong></td>
<td valign="top"><a href="#tag">Tag</a></td>
<td>

Requires a valid authorization token. Creates a new tag

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">datatype</td>
<td valign="top"><a href="#datatype">Datatype</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">value</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">scanClassId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateTag</strong></td>
<td valign="top"><a href="#tag">Tag</a></td>
<td>

Requires a valid authorization token. Updates an existing tag

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">value</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">scanClassId</td>
<td valign="top"><a href="#id">ID</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteTag</strong></td>
<td valign="top"><a href="#tag">Tag</a></td>
<td>

Requires a valid authorization token. Deletes a tag. Will delete any source assigned to this tag, and tag will no longer be scanned.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createModbus</strong></td>
<td valign="top"><a href="#device">Device</a></td>
<td>

Requires a valid authorization token. Creates a modbus device, and automatically starts a connection.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">host</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">port</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">reverseBits</td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">reverseWords</td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">zeroBased</td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateModbus</strong></td>
<td valign="top"><a href="#device">Device</a></td>
<td>

Requires a valid authorization token. Updates an existing modbus device and refreshes the connection.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">host</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">port</td>
<td valign="top"><a href="#int">Int</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">reverseBits</td>
<td valign="top"><a href="#boolean">Boolean</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">reverseWords</td>
<td valign="top"><a href="#boolean">Boolean</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">zeroBased</td>
<td valign="top"><a href="#boolean">Boolean</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteModbus</strong></td>
<td valign="top"><a href="#device">Device</a></td>
<td>

Requires a valid authorization token. Deletes a modbus device. All sources assigned to this device are deleted and tags using
this device as a source will have their sources set to null, making their values static.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createModbusSource</strong></td>
<td valign="top"><a href="#modbussource">ModbusSource</a></td>
<td>

Requires a valid authorization token. Creates a modbus source. The tag value will then be updated to the value at the source register per the scan class

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">deviceId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">register</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">registerType</td>
<td valign="top"><a href="#modbusregistertype">ModbusRegisterType</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateModbusSource</strong></td>
<td valign="top"><a href="#modbussource">ModbusSource</a></td>
<td>

Requires a valid authorization token. Updates a modbus source register. The tag value will then update per the new register at the rate of the scan class.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">register</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">registerType</td>
<td valign="top"><a href="#modbusregistertype">ModbusRegisterType</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteModbusSource</strong></td>
<td valign="top"><a href="#modbussource">ModbusSource</a></td>
<td>

Requires a valid authorization token. Deletes a modbus source. The tag value will then be static.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createEthernetIP</strong></td>
<td valign="top"><a href="#device">Device</a></td>
<td>

Requires a valid authorization token. Creates an Ethernet/IP device, and automatically starts a connection.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">host</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">slot</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateEthernetIP</strong></td>
<td valign="top"><a href="#device">Device</a></td>
<td>

Requires a valid authorization token. Updates an existing Ethernet/IP device and refreshes the connection.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">host</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">slot</td>
<td valign="top"><a href="#int">Int</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteEthernetIP</strong></td>
<td valign="top"><a href="#device">Device</a></td>
<td>

Requires a valid authorization token. Deletes an Ethernet/IP device. All sources assigned to this device are deleted and tags using
this device as a source will have their sources set to null, making their values static.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createEthernetIPSource</strong></td>
<td valign="top"><a href="#ethernetipsource">EthernetIPSource</a></td>
<td>

Requires a valid authorization token. Creates an Ethernet/IP source. The tag value will then be updated to the value at the source register per the scan class

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">deviceId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagname</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateEthernetIPSource</strong></td>
<td valign="top"><a href="#ethernetipsource">EthernetIPSource</a></td>
<td>

Requires a valid authorization token. Updates an Ethernet/IP source tagname. The tag value will then update per the new tagname at the rate of the scan class.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagname</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteEthernetIPSource</strong></td>
<td valign="top"><a href="#ethernetipsource">EthernetIPSource</a></td>
<td>

Requires a valid authorization token. Deletes an Ethernet/IP source. The tag value will then be static.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">tagId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createMqtt</strong></td>
<td valign="top"><a href="#service">Service</a></td>
<td>

Requires a valid authorization token. Creates an MQTT Sparkplug B service (tied to a single MQTT broker).

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">host</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">port</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">group</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">node</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">username</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">password</td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">devices</td>
<td valign="top">[<a href="#int">Int</a>!]!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">rate</td>
<td valign="top"><a href="#int">Int</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">encrypt</td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>updateMqtt</strong></td>
<td valign="top"><a href="#service">Service</a></td>
<td>

Requires a valid authorization token. Updates an MQTT Sparkplug B service and restarts the connection.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">name</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">description</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">host</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">port</td>
<td valign="top"><a href="#int">Int</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">group</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">node</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">username</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">password</td>
<td valign="top"><a href="#string">String</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">rate</td>
<td valign="top"><a href="#int">Int</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">encrypt</td>
<td valign="top"><a href="#boolean">Boolean</a></td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>addMqttDevice</strong></td>
<td valign="top"><a href="#service">Service</a></td>
<td>

Requires a valid authorization token. Adds a device to an MQTT service. All the tags with sources from that device will be published at the rate of the MQTT service configuration.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">deviceId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteMqttDevice</strong></td>
<td valign="top"><a href="#service">Service</a></td>
<td>

Requires a valid authorization token. Deletes a device from an MQTT service. The tags for the removed device will no longer be published to the broker (but the device and tags will still exist).

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">deviceId</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>deleteMqtt</strong></td>
<td valign="top"><a href="#service">Service</a></td>
<td>

Requires a valid authorization token. Deletes an MQTT Service. All devices assigned to this service will no longer have their tags published.

</td>
</tr>
<tr>
<td colspan="2" align="right" valign="top">id</td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
</tbody>
</table>

## Objects

### AuthPayload

The data returned after a successful login attempt.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>token</strong></td>
<td valign="top"><a href="#string">String</a></td>
<td>

Bearer token to be added to the Authorization header for future requests.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>user</strong></td>
<td valign="top"><a href="#user">User</a></td>
<td>

User that successfully logged in.

</td>
</tr>
</tbody>
</table>

### Device

A Device is a something that can serve data to be used for updating tag values, such as a modbus TCP or Ethernet/IP server.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>name</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Identifier for the device that will be also used for external services, such as MQTT Sparkplug B.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>description</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Description to allow for users to give the device more context.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>config</strong></td>
<td valign="top"><a href="#deviceconfig">DeviceConfig</a></td>
<td>

Configuration is specific to the protocol used by the device, such as modbus or Ethernet/IP

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createdBy</strong></td>
<td valign="top"><a href="#user">User</a></td>
<td>

User who created the tag.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createdOn</strong></td>
<td valign="top"><a href="#datetime">DateTime</a>!</td>
<td>

Date/time the tag was created.

</td>
</tr>
</tbody>
</table>

### EthernetIP

Ethernet/IP is a device config allowing for access to data for updating tag values per the ODVA Ethernet/IP specification.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>device</strong></td>
<td valign="top"><a href="#device">Device</a>!</td>
<td>

Device for this Ethernet/IP configuration.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>host</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Host or IP address of the Ethernet/IP device. Port is fixed at 44818.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>slot</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Slot of the PLC. It is typically zero for devices that do no have slots or where the PLC is fixed.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>sources</strong></td>
<td valign="top">[<a href="#ethernetipsource">EthernetIPSource</a>!]!</td>
<td>

List of sources (tag/register) pairs that are using this Ethernet/IP device.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>status</strong></td>
<td valign="top"><a href="#string">String</a></td>
<td>

Status of the Ethernet/IP device connection. Will be connected if connection is successful or an error message if connection failed.

</td>
</tr>
</tbody>
</table>

### EthernetIPSource

An Ethernet/IP source reads an tag from an Ethernet/IP device and updates a tag value per the tags scan class.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>ethernetip</strong></td>
<td valign="top"><a href="#ethernetip">EthernetIP</a>!</td>
<td>

The ethernet/IP device this source uses to get the register values.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>tag</strong></td>
<td valign="top"><a href="#tag">Tag</a>!</td>
<td>

The tag to update.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>tagname</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

The tagname of the tag in the Ethernet/IP device (not to be confused with the name of the tag in this gateway)

</td>
</tr>
</tbody>
</table>

### Modbus

Modbus is a device config allowing for access to data for updating tag values per the Modbus TCP specification.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>device</strong></td>
<td valign="top"><a href="#device">Device</a>!</td>
<td>

Device for this modbus configuration.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>host</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Host or IP address of the modbus device.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>port</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Port of the modbus device.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>reverseBits</strong></td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td>

Whether registers are stored as Big Endian (false) or Little Endian (true).

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>reverseWords</strong></td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td>

Whether multiregister sources should use the lowest register first (false) or the highest register first (true).

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>sources</strong></td>
<td valign="top">[<a href="#modbussource">ModbusSource</a>!]!</td>
<td>

List of sources (tag/register) pairs that are using this modbus device.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>status</strong></td>
<td valign="top"><a href="#string">String</a></td>
<td>

Status of the modbus device connection. Will be connected if connection is successful or an error message if connection failed.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>zeroBased</strong></td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td>

Whether registers start from zero or one. Can be used to make sure device addresses and those configured in the gateway match (and are not one off from eachother)

</td>
</tr>
</tbody>
</table>

### ModbusSource

A Mobus source reads a register from a modbus TCP device and updates a tag value per the tags scan class.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>modbus</strong></td>
<td valign="top"><a href="#modbus">Modbus</a>!</td>
<td>

The modbus device this source uses to get the register values.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>tag</strong></td>
<td valign="top"><a href="#tag">Tag</a>!</td>
<td>

The tag to update.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>register</strong></td>
<td valign="top"><a href="#int">Int</a>!</td>
<td>

The starting register to read from the modbus device.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>registerType</strong></td>
<td valign="top"><a href="#modbusregistertype">ModbusRegisterType</a>!</td>
<td>

The register type per the modbus specification. Can be `HOLDING_REGISTER`, `INPUT_REGISTER`, `DISCRETE_INPUT`, or `COIL`.

</td>
</tr>
</tbody>
</table>

### Mqtt

MQTT is a service that allows for publishing tag values to an MQTT broker using the sparkplug B specification, which will server data to other subscribing nodes. One broker per service.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>host</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Hostname or IP address of the MQTT broker

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>port</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Port for the service on the MQTT broker

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>group</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Identifies a logical grouping of edge devices.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>node</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Identifies the edge device pushing data to the MQTT broker.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>username</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

MQTT Broker username.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>password</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

MQTT Broker password.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>sources</strong></td>
<td valign="top">[<a href="#mqttsource">MqttSource</a>!]!</td>
<td>

List of MQTT source devices that will be publishing to this broker.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>rate</strong></td>
<td valign="top"><a href="#int">Int</a>!</td>
<td>

Publishing rate in milliseconds

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>encrypt</strong></td>
<td valign="top"><a href="#boolean">Boolean</a>!</td>
<td>

True if ssl:// is to be used, otherwise tcp:// will be used.

</td>
</tr>
</tbody>
</table>

### MqttSource

An MQTT source publishes data from all tags with the same device source. The device name will be used as the `Device` field in sparkplug B.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>mqtt</strong></td>
<td valign="top"><a href="#mqtt">Mqtt</a>!</td>
<td>

MQTT service (broker)

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>device</strong></td>
<td valign="top"><a href="#device">Device</a>!</td>
<td>

Source device. All tags updating their values from this device will be published at the MQTT services configured scan rate.

</td>
</tr>
</tbody>
</table>

### ScanClass

A scan class allows for groups of tags to be updated at the same pre-defined rate.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>rate</strong></td>
<td valign="top"><a href="#int">Int</a>!</td>
<td>

Rate at which to update that tags assigned to this scan class from their device source.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>tags</strong></td>
<td valign="top">[<a href="#tag">Tag</a>!]!</td>
<td>

List of tags assigned to this scan class

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>scanCount</strong></td>
<td valign="top"><a href="#int">Int</a>!</td>
<td>

The number of times this scan class has been scanned since the scan class scan started. This values clears to zero when the periodic scan is stopped.

</td>
</tr>
</tbody>
</table>

### Service

A service makes data available to external services by acting as a server or publishing the data as is done with MQTT.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>name</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Identifier for the service.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>description</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Description to allow for users to give the service more context.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>config</strong></td>
<td valign="top"><a href="#mqtt">Mqtt</a></td>
<td>

Configuration is specific to the protocol used by the service, such as MQTT

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createdBy</strong></td>
<td valign="top"><a href="#user">User</a></td>
<td>

User who created the service.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createdOn</strong></td>
<td valign="top"><a href="#datetime">DateTime</a>!</td>
<td>

Date/time the service was created.

</td>
</tr>
</tbody>
</table>

### Tag

A Tag stores data point values. It's value can be updated from a device source per it's scan class, and it's value can be made available to external services like MQTT.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>name</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Identifier for the tag that will be also used for external services, such as MQTT Sparkplug B.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>description</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td>

Description to allow for users to give the tag more context.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>value</strong></td>
<td valign="top"><a href="#string">String</a></td>
<td>

Tag value, which is updated at the scan class rate from the assigned source and also delivered to services that use this tag as a source.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>datatype</strong></td>
<td valign="top"><a href="#datatype">Datatype</a>!</td>
<td>

Format of that tag value, allowing clients to parse the value appropriately.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>scanClass</strong></td>
<td valign="top"><a href="#scanclass">ScanClass</a>!</td>
<td>

Assigned scan class which determines the rate at which the tag is updated from it's assigned source.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createdBy</strong></td>
<td valign="top"><a href="#user">User</a></td>
<td>

User who created the tag.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>createdOn</strong></td>
<td valign="top"><a href="#datetime">DateTime</a>!</td>
<td>

Date/time the tag was created.

</td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>source</strong></td>
<td valign="top"><a href="#source">Source</a></td>
<td>

Source from which this tag value is updated.

</td>
</tr>
</tbody>
</table>

### User

Credentials used to identify who is logging into the gateway.

<table>
<thead>
<tr>
<th align="left">Field</th>
<th align="right">Argument</th>
<th align="left">Type</th>
<th align="left">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td colspan="2" valign="top"><strong>id</strong></td>
<td valign="top"><a href="#id">ID</a>!</td>
<td></td>
</tr>
<tr>
<td colspan="2" valign="top"><strong>username</strong></td>
<td valign="top"><a href="#string">String</a>!</td>
<td></td>
</tr>
</tbody>
</table>

## Enums

### Datatype

Tag datatypes allowing for clients to properly parse tag values.

<table>
<thead>
<th align="left">Value</th>
<th align="left">Description</th>
</thead>
<tbody>
<tr>
<td valign="top"><strong>BOOLEAN</strong></td>
<td></td>
</tr>
<tr>
<td valign="top"><strong>INT16</strong></td>
<td></td>
</tr>
<tr>
<td valign="top"><strong>INT32</strong></td>
<td></td>
</tr>
<tr>
<td valign="top"><strong>FLOAT</strong></td>
<td></td>
</tr>
</tbody>
</table>

### ModbusRegisterType

Modbus register types for use with modbus sources per the modbus specification.

<table>
<thead>
<th align="left">Value</th>
<th align="left">Description</th>
</thead>
<tbody>
<tr>
<td valign="top"><strong>DISCRETE_INPUT</strong></td>
<td></td>
</tr>
<tr>
<td valign="top"><strong>COIL</strong></td>
<td></td>
</tr>
<tr>
<td valign="top"><strong>INPUT_REGISTER</strong></td>
<td></td>
</tr>
<tr>
<td valign="top"><strong>HOLDING_REGISTER</strong></td>
<td></td>
</tr>
</tbody>
</table>

## Scalars

### Boolean

The `Boolean` scalar type represents `true` or `false`.

### DateTime

Used to deliver timestamp values.

### ID

The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID.

### Int

The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.

### String

The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.


<!-- END graphql-markdown -->