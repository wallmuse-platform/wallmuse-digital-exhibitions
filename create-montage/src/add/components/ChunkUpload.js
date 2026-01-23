{/* Toggle between ChunkedUpload and TextField */ }
{
    showUpload ? (
        <ChunkedUpload onUploadSuccess={handleUploadSuccess} />
    ) : (
        <TextField
            fullWidth
            label="HD/4K Version URL"
            name="hdPath"
            value={contentData.media.hdPath}
            onChange={(e) =>
                setContentData({
                    ...contentData,
                    media: { ...contentData.media, hdPath: e.target.value },
                })
            }
            sx={{ mt: 2 }}
        />
    )
}

{/* Button to toggle upload or provide link */ }
<Button
    variant="outlined"
    fullWidth
    onClick={handleButtonClick}
    sx={{ mt: 2 }}
>
    {showUpload ? "PROVIDE LINK" : "BROWSE OR PROVIDE LINK"}
</Button>