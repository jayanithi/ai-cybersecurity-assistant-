import React from "react";

import {
  Box,
  Button,
  Typography,
  Pagination,
  FormControl,
  Select,
  MenuItem
} from "@mui/material";

import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";


const ReportsPagination = ({
  pagination,
  onPageChange,
  onLimitChange
}) => {

  // ============================================================
  // DEFAULT PAGINATION
  // ============================================================

  if (!pagination) {

    return null;

  }


  const {

    page = 1,

    limit = 10,

    totalReports = 0,

    totalPages = 1,

    hasNextPage = false,

    hasPreviousPage = false

  } = pagination;


  // ============================================================
  // HANDLE PAGE CHANGE
  // ============================================================

  const handlePageChange = (
    event,
    newPage
  ) => {

    if (
      typeof onPageChange === "function"
    ) {

      onPageChange(
        newPage
      );

    }

  };


  // ============================================================
  // HANDLE LIMIT CHANGE
  // ============================================================

  const handleLimitChange = (
    event
  ) => {

    const newLimit =
      Number(
        event.target.value
      );


    if (
      typeof onLimitChange === "function"
    ) {

      onLimitChange(
        newLimit
      );

    }

  };


  // ============================================================
  // PREVIOUS PAGE
  // ============================================================

  const handlePrevious = () => {

    if (
      page > 1 &&
      hasPreviousPage &&
      typeof onPageChange === "function"
    ) {

      onPageChange(
        page - 1
      );

    }

  };


  // ============================================================
  // NEXT PAGE
  // ============================================================

  const handleNext = () => {

    if (
      page < totalPages &&
      hasNextPage &&
      typeof onPageChange === "function"
    ) {

      onPageChange(
        page + 1
      );

    }

  };


  // ============================================================
  // CALCULATE DISPLAY RANGE
  // ============================================================

  const startReport =
    totalReports === 0
      ? 0
      : (
          (page - 1) * limit
        ) + 1;


  const endReport =
    Math.min(
      page * limit,
      totalReports
    );


  // ============================================================
  // UI
  // ============================================================

  return (

    <Box

      sx={{

        mt: 3,

        display:
          "flex",

        justifyContent:
          "space-between",

        alignItems:
          "center",

        flexWrap:
          "wrap",

        gap: 2,

        p: 2,

        borderRadius: 3,

        bgcolor:
          "#111827",

        border:
          "1px solid rgba(255,255,255,0.08)"

      }}

    >


      {/* ======================================================
          LEFT SIDE
          REPORT COUNT + LIMIT SELECT
      ====================================================== */}

      <Box

        sx={{

          display:
            "flex",

          alignItems:
            "center",

          gap: 2,

          flexWrap:
            "wrap"

        }}

      >


        {/* Report Range */}

        <Typography

          sx={{

            color:
              "#aaa",

            fontSize:
              "0.9rem"

          }}

        >

          Showing{" "}

          <strong
            style={{
              color:
                "#fff"
            }}
          >

            {startReport}

          </strong>

          {" "}to{" "}

          <strong
            style={{
              color:
                "#fff"
            }}
          >

            {endReport}

          </strong>

          {" "}of{" "}

          <strong
            style={{
              color:
                "#00E5FF"
            }}
          >

            {totalReports}

          </strong>

          {" "}reports

        </Typography>


        {/* Reports Per Page */}

        <Box

          sx={{

            display:
              "flex",

            alignItems:
              "center",

            gap: 1

          }}

        >

          <Typography

            sx={{

              color:
                "#aaa",

              fontSize:
                "0.85rem"

            }}

          >

            Per page:

          </Typography>


          <FormControl
            size="small"
          >

            <Select

              value={
                limit
              }

              onChange={
                handleLimitChange
              }

              sx={{

                color:
                  "#fff",

                minWidth:
                  80,

                ".MuiOutlinedInput-notchedOutline": {

                  borderColor:
                    "rgba(255,255,255,0.2)"

                },

                "&:hover .MuiOutlinedInput-notchedOutline": {

                  borderColor:
                    "#00E5FF"

                },

                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {

                  borderColor:
                    "#00E5FF"

                },

                ".MuiSvgIcon-root": {

                  color:
                    "#fff"

                }

              }}

              MenuProps={{

                PaperProps: {

                  sx: {

                    bgcolor:
                      "#1d263b",

                    color:
                      "#fff"

                  }

                }

              }}

            >

              <MenuItem value={5}>
                5
              </MenuItem>

              <MenuItem value={10}>
                10
              </MenuItem>

              <MenuItem value={20}>
                20
              </MenuItem>

              <MenuItem value={50}>
                50
              </MenuItem>

            </Select>

          </FormControl>

        </Box>

      </Box>


      {/* ======================================================
          RIGHT SIDE
          PAGINATION CONTROLS
      ====================================================== */}

      <Box

        sx={{

          display:
            "flex",

          alignItems:
            "center",

          gap: 1,

          flexWrap:
            "wrap"

        }}

      >


        {/* Previous Button */}

        <Button

          variant="outlined"

          startIcon={
            <NavigateBeforeIcon />
          }

          onClick={
            handlePrevious
          }

          disabled={
            !hasPreviousPage ||
            page <= 1
          }

          sx={{

            color:
              "#fff",

            borderColor:
              "rgba(255,255,255,0.2)",

            "&:hover": {

              borderColor:
                "#00E5FF",

              color:
                "#00E5FF"

            },

            "&.Mui-disabled": {

              color:
                "#555",

              borderColor:
                "rgba(255,255,255,0.05)"

            }

          }}

        >

          Previous

        </Button>


        {/* Page Numbers */}

        <Pagination

          count={
            Math.max(
              1,
              totalPages
            )
          }

          page={
            Math.min(
              page,
              Math.max(
                1,
                totalPages
              )
            )
          }

          onChange={
            handlePageChange
          }

          shape="rounded"

          siblingCount={1}

          boundaryCount={1}

          sx={{

            ".MuiPaginationItem-root": {

              color:
                "#fff"

            },

            ".MuiPaginationItem-root:hover": {

              bgcolor:
                "rgba(0,229,255,0.15)"

            },

            ".Mui-selected": {

              bgcolor:
                "#00E5FF !important",

              color:
                "#000 !important",

              fontWeight:
                700

            }

          }}

        />


        {/* Next Button */}

        <Button

          variant="outlined"

          endIcon={
            <NavigateNextIcon />
          }

          onClick={
            handleNext
          }

          disabled={
            !hasNextPage ||
            page >= totalPages
          }

          sx={{

            color:
              "#fff",

            borderColor:
              "rgba(255,255,255,0.2)",

            "&:hover": {

              borderColor:
                "#00E5FF",

              color:
                "#00E5FF"

            },

            "&.Mui-disabled": {

              color:
                "#555",

              borderColor:
                "rgba(255,255,255,0.05)"

            }

          }}

        >

          Next

        </Button>

      </Box>


      {/* ======================================================
          MOBILE PAGE INFO
      ====================================================== */}

      <Box

        sx={{

          width:
            "100%",

          display:
            {

              xs:
                "block",

              md:
                "none"

            },

          textAlign:
            "center"

        }}

      >

        <Typography

          sx={{

            color:
              "#777",

            fontSize:
              "0.8rem"

          }}

        >

          Page {page} of {totalPages}

        </Typography>

      </Box>


    </Box>

  );

};


export default ReportsPagination;