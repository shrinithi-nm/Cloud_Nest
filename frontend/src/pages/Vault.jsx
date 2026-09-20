import { useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  CloudUpload,
  File,
  FileText,
  FolderOpen,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import { addActivity } from '../services/activity'

function Vault() {
  const inputRef = useRef(null)

  const [files, setFiles] = useState(() =>
    JSON.parse(
      localStorage.getItem('cloudnest-vault') || '[]'
    )
  )

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [subject, setSubject] = useState('General')

  const subjects = useMemo(
    () => [
      'All',
      ...new Set(files.map((file) => file.subject))
    ],
    [files]
  )

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesSubject =
  subjectFilter === 'All' ||
  file.subject?.trim().toLowerCase() ===
    subjectFilter.trim().toLowerCase()

    return matchesSearch && matchesSubject
  })

  const totalSize = files.reduce(
    (total, file) => total + file.size,
    0
  )

  const saveFiles = (updated) => {
    setFiles(updated)

    localStorage.setItem(
      'cloudnest-vault',
      JSON.stringify(updated)
    )
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)
  }

  const uploadFile = () => {
    if (!selectedFile) {
      return
    }

    const newFile = {
      id: `file-${Date.now()}`,
      name: selectedFile.name,
      type: selectedFile.type || 'Unknown',
      size: selectedFile.size,
      subject: subject || 'General',
      uploadedAt: new Date().toISOString()
    }

    saveFiles([newFile, ...files])

    addActivity({
      type: 'vault',
      title: 'File added to Vault',
      description: `${selectedFile.name} was added under ${newFile.subject}.`
    })

    setSelectedFile(null)
    setSubject('General')
    setShowUpload(false)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const deleteFile = (id) => {
    const file = files.find(
      (item) => item.id === id
    )

    const updated = files.filter(
      (item) => item.id !== id
    )

    saveFiles(updated)

    if (file) {
      addActivity({
        type: 'vault',
        title: 'File removed from Vault',
        description: `${file.name} was removed.`
      })
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`
  }

  return (
    <div>
      <section className="vault-page-header">
        <div>
          <p className="page-eyebrow">
            CLOUD WORKSPACE
          </p>

          <h1 className="page-title">
            Cloud Vault
          </h1>

          <p className="page-description">
            Organize notes, study material and academic
            resources inside your CloudNest workspace.
          </p>
        </div>

        <button
          className="vault-upload-button"
          onClick={() => setShowUpload(true)}
        >
          <Upload size={16} />
          Upload file
        </button>
      </section>

      <section className="vault-stats">
        <article className="vault-stat card">
          <FolderOpen size={19} />

          <div>
            <strong>{files.length}</strong>
            <span>Files stored</span>
          </div>
        </article>

        <article className="vault-stat card">
          <FileText size={19} />

          <div>
            <strong>
              {
                new Set(
                  files.map((file) => file.subject)
                ).size
              }
            </strong>
            <span>Subject folders</span>
          </div>
        </article>

        <article className="vault-stat card">
          <CloudUpload size={19} />

          <div>
            <strong>
              {formatSize(totalSize)}
            </strong>
            <span>Workspace size</span>
          </div>
        </article>
      </section>

      <section className="vault-toolbar">
        <div className="vault-search">
          <Search size={16} />

          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={subjectFilter}
          onChange={(event) =>
            setSubjectFilter(event.target.value)
          }
        >
          {subjects.map((item) => (
            <option key={item}>
              {item}
            </option>
          ))}
        </select>
      </section>

      {filteredFiles.length === 0 ? (
        <section className="vault-empty card">
          <div className="vault-empty-icon">
            <FolderOpen size={27} />
          </div>

          <h2>
            {files.length === 0
              ? 'Your Vault is empty'
              : 'No matching files'}
          </h2>

          <p>
            {files.length === 0
              ? 'Upload study notes, PDFs and academic resources to start organizing your workspace.'
              : 'Try another file name or subject filter.'}
          </p>

          {files.length === 0 && (
            <button
              onClick={() => setShowUpload(true)}
            >
              <Upload size={15} />
              Upload first file
            </button>
          )}
        </section>
      ) : (
        <section className="vault-file-grid">
          {filteredFiles.map((file, index) => (
            <motion.article
              className="vault-file card"
              key={file.id}
              initial={{
                opacity: 0,
                y: 12
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              transition={{
                delay: Math.min(
                  index * 0.04,
                  0.3
                )
              }}
            >
              <div className="vault-file-top">
                <div className="vault-file-icon">
                  <File size={21} />
                </div>

                <button
                  onClick={() =>
                    deleteFile(file.id)
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <h2 title={file.name}>
                {file.name}
              </h2>

              <span className="vault-subject">
                {file.subject}
              </span>

              <div className="vault-file-meta">
                <span>
                  {formatSize(file.size)}
                </span>

                <span>
                  {new Date(
                    file.uploadedAt
                  ).toLocaleDateString(
                    'en-IN',
                    {
                      day: 'numeric',
                      month: 'short'
                    }
                  )}
                </span>
              </div>
            </motion.article>
          ))}
        </section>
      )}

      {showUpload && (
        <div className="modal-backdrop">
          <motion.div
            className="vault-upload-modal"
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 12
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
          >
            <div className="modal-header">
              <div>
                <p className="page-eyebrow">
                  CLOUD VAULT
                </p>

                <h2>Upload resource</h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowUpload(false)
                }
              >
                <X size={19} />
              </button>
            </div>

            <button
              type="button"
              className="vault-dropzone"
              onClick={() =>
                inputRef.current?.click()
              }
            >
              <CloudUpload size={29} />

              <strong>
                {selectedFile
                  ? selectedFile.name
                  : 'Choose a file'}
              </strong>

              <span>
                {selectedFile
                  ? formatSize(
                      selectedFile.size
                    )
                  : 'Select study material from your device'}
              </span>
            </button>

            <input
              ref={inputRef}
              className="vault-file-input"
              type="file"
              onChange={handleFile}
            />

            <label className="vault-subject-field">
              Subject

              <input
                type="text"
                value={subject}
                placeholder="Database Systems"
                onChange={(event) =>
                  setSubject(
                    event.target.value
                  )
                }
              />
            </label>

            <button
              className="vault-confirm-button"
              onClick={uploadFile}
              disabled={!selectedFile}
            >
              <Upload size={16} />
              Add to Vault
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Vault