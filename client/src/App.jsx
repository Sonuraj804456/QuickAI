import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'

import Home from './pages/Home'
import Layout from './pages/Layout'
import Dashboard from './pages/Dashboard'
import GenerateImages from './pages/GenerateImages'
import Community from './pages/Community'
import WriteArticle from './pages/WriteArticle'
import BlogTitles from './pages/BlogTitles'
import LectureCopilot from './pages/LectureCopilot'
import RemoveBackground from './pages/RemoveBackground'
import RemoveObject from './pages/RemoveObject'
import ReviewResume from './pages/ReviewResume'
import ChatPdf from './pages/ChatPdf'
import DeepResearch from './pages/DeepResearch'
import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {Toaster} from 'react-hot-toast'

const App = () => {

  return (
    <div>
      <Toaster />
    <Routes>
      {/* Public Home */}
      <Route path='/' element={<Home />} />

      {/* AI Section with Layout (Navbar here) */}
      <Route path='/ai' element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path='write-article' element={<WriteArticle />} />
        <Route path='lecture-copilot' element={<LectureCopilot />} />
        <Route path='blog-titles' element={<Navigate to='/ai/lecture-copilot' replace />} />
        <Route path='generate-images' element={<GenerateImages />} />
        <Route path='remove-background' element={<RemoveBackground />} />
        <Route path='remove-object' element={<RemoveObject />} />
        <Route path='review-resume' element={<ReviewResume />} />
        <Route path='chat-pdf' element={<ChatPdf />} />
        <Route path='deep-research' element={<DeepResearch />} />
        <Route path='community' element={<Community />} />
      </Route>
    </Routes>
    </div>
  )
}

export default App
