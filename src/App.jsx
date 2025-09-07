import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import './App.css'

function App() {
  const [rootName, setRootName] = useState('')
  const [xmlNamespace, setXmlNamespace] = useState('')
  const [targetNamespace, setTargetNamespace] = useState('')
  const [dataTypeName, setDataTypeName] = useState('')
  const [messageType, setMessageType] = useState('Message Type')
  const [configuration, setConfiguration] = useState('default')
  const [result, setResult] = useState('')

  // Initialize grid with empty rows
  const initializeGrid = () => {
    const rows = []
    for (let i = 0; i < 50; i++) {
      rows.push({
        id: i,
        structure: '',
        field: '',
        name: '',
        type: '',
        name2: '',
        minOccurs: '0',
        maxOccurs: '1'
      })
    }
    return rows
  }

  const [gridData, setGridData] = useState(initializeGrid())

  // Update grid cell value
  const updateGridCell = (rowIndex, field, value) => {
    setGridData(prevData => 
      prevData.map((row, index) => 
        index === rowIndex ? { ...row, [field]: value } : row
      )
    )
  }

  const handleGenerate = () => {
    // Generate result based on input fields and grid data
    const filledRows = gridData.filter(row => 
      row.structure || row.field || row.name || row.type || row.name2
    )

    let generatedResult = `EAI Work Tool - Generated Result\n\n`
    
    if (rootName) generatedResult += `Root Name: ${rootName}\n`
    if (xmlNamespace) generatedResult += `XML Namespace: ${xmlNamespace}\n`
    if (targetNamespace) generatedResult += `Target Namespace: ${targetNamespace}\n`
    if (dataTypeName) generatedResult += `Data Type Name: ${dataTypeName}\n`
    
    generatedResult += `Message Type: ${messageType}\n\n`

    if (filledRows.length > 0) {
      generatedResult += `Data Structure:\n`
      filledRows.forEach((row, index) => {
        generatedResult += `  ${index + 1}. `
        if (row.structure) generatedResult += `Structure: ${row.structure}, `
        if (row.field) generatedResult += `Field: ${row.field}, `
        if (row.name) generatedResult += `Name: ${row.name}, `
        if (row.type) generatedResult += `Type: ${row.type}, `
        if (row.name2) generatedResult += `Name2: ${row.name2}, `
        generatedResult += `Min Occurs: ${row.minOccurs}, Max Occurs: ${row.maxOccurs}\n`
      })
    } else {
      generatedResult += `No data structure defined.\n`
    }

    generatedResult += `\nGenerated on: ${new Date().toLocaleString()}\n`
    generatedResult += `\nWelcome to EAI Work Tool.\n\n`
    generatedResult += `User guide (KO) : EAI Work Tool User Guide (KO)\n`
    generatedResult += `User guide (EN) : EAI Work Tool User Guide (EN)\n\n`
    generatedResult += `Copyright (C) 2024 YoungHyun Cho\nAll Rights Reserved.`

    setResult(generatedResult)
  }

  const handleClear = () => {
    setRootName('')
    setXmlNamespace('')
    setTargetNamespace('')
    setDataTypeName('')
    setResult('')
    setGridData(initializeGrid())
  }

  const handleLoadToGrid = () => {
    // Simulate loading data to grid - could be enhanced with actual data loading
    alert('Load to grid functionality - feature under development')
  }

  const handleDownload = () => {
    if (!result) {
      alert('No result to download. Please generate result first.')
      return
    }

    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'eai_work_tool_result.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    if (!result) {
      alert('No result to copy. Please generate result first.')
      return
    }

    try {
      await navigator.clipboard.writeText(result)
      alert('Result copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy: ', err)
      alert('Failed to copy to clipboard')
    }
  }

  const handleConfiguration = () => {
    alert('Configuration feature is under development')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-700">EAI Work Tool</h1>
        <div className="flex gap-2">
          <Select value={configuration} onValueChange={setConfiguration}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">default</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            className="bg-orange-100 hover:bg-orange-200"
            onClick={handleConfiguration}
          >
            Configuration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Source Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={messageType} onValueChange={setMessageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Message Type">Message Type</SelectItem>
                <SelectItem value="Data Type">Data Type</SelectItem>
                <SelectItem value="Statement">Statement</SelectItem>
                <SelectItem value="Test Data">Test Data</SelectItem>
                <SelectItem value="Message Mapping">Message Mapping</SelectItem>
              </SelectContent>
            </Select>

            <div className="space-y-3">
              <div>
                <Label htmlFor="rootName" className="text-sm font-medium">
                  Root Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rootName"
                  placeholder="Required"
                  value={rootName}
                  onChange={(e) => setRootName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="xmlNamespace" className="text-sm font-medium">
                  XML Namespace
                </Label>
                <Input
                  id="xmlNamespace"
                  placeholder="Optional"
                  value={xmlNamespace}
                  onChange={(e) => setXmlNamespace(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="targetNamespace" className="text-sm font-medium">
                  Target Namespace
                </Label>
                <Input
                  id="targetNamespace"
                  placeholder="Optional"
                  value={targetNamespace}
                  onChange={(e) => setTargetNamespace(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="dataTypeName" className="text-sm font-medium">
                  Data Type Name
                </Label>
                <Input
                  id="dataTypeName"
                  placeholder="Optional"
                  value={dataTypeName}
                  onChange={(e) => setDataTypeName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleGenerate} className="bg-green-600 hover:bg-green-700">
                Generate
              </Button>
              <Button onClick={handleClear} variant="outline">
                Clear
              </Button>
            </div>

            <Tabs defaultValue="view" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="view">VIEW</TabsTrigger>
                <TabsTrigger value="edit">EDIT</TabsTrigger>
              </TabsList>
              <TabsContent value="view" className="mt-4">
                <Button onClick={handleLoadToGrid} className="w-full">
                  Load to grid
                </Button>
              </TabsContent>
              <TabsContent value="edit" className="mt-4">
                <Button onClick={handleLoadToGrid} className="w-full">
                  Load to grid
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right Panel - Result */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
                Download
              </Button>
              <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-700">
                Copy
              </Button>
            </div>
            <div className="bg-white border rounded p-4 min-h-[300px] font-mono text-sm whitespace-pre-wrap">
              {result || 'Welcome to EAI Work Tool.\n\nUser guide (KO) : EAI Work Tool User Guide (KO)\nUser guide (EN) : EAI Work Tool User Guide (EN)\n\nCopyright (C) 2024 YoungHyun Cho\nAll Rights Reserved.'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Data Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1 text-xs">Structure</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs">Field</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs">Type</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs">Name</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs">Min Occurs</th>
                  <th className="border border-gray-300 px-2 py-1 text-xs">Max Occurs</th>
                </tr>
              </thead>
              <tbody>
                {gridData.slice(0, 20).map((row, index) => (
                  <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-1">
                      <Input 
                        className="h-6 text-xs border-0" 
                        value={row.structure}
                        onChange={(e) => updateGridCell(index, 'structure', e.target.value)}
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input 
                        className="h-6 text-xs border-0" 
                        value={row.field}
                        onChange={(e) => updateGridCell(index, 'field', e.target.value)}
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input 
                        className="h-6 text-xs border-0" 
                        value={row.name}
                        onChange={(e) => updateGridCell(index, 'name', e.target.value)}
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input 
                        className="h-6 text-xs border-0" 
                        value={row.type}
                        onChange={(e) => updateGridCell(index, 'type', e.target.value)}
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input 
                        className="h-6 text-xs border-0" 
                        value={row.name2}
                        onChange={(e) => updateGridCell(index, 'name2', e.target.value)}
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Select 
                        value={row.minOccurs} 
                        onValueChange={(value) => updateGridCell(index, 'minOccurs', value)}
                      >
                        <SelectTrigger className="h-6 text-xs border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Select 
                        value={row.maxOccurs} 
                        onValueChange={(value) => updateGridCell(index, 'maxOccurs', value)}
                      >
                        <SelectTrigger className="h-6 text-xs border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="unbounded">unbounded</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>Welcome to EAI Work Tool.</p>
        <p className="mt-2">
          User guide (KO) : <a href="#" className="text-blue-600 hover:underline">EAI Work Tool User Guide (KO)</a>
          {' | '}
          User guide (EN) : <a href="#" className="text-blue-600 hover:underline">EAI Work Tool User Guide (EN)</a>
        </p>
        <p className="mt-2">Copyright (C) 2024 YoungHyun Cho All Rights Reserved.</p>
      </div>
    </div>
  )
}

export default App